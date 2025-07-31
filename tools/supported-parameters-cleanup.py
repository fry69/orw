#!/usr/bin/env python3
"""
Script to migrate SQLite database changes from old supported_parameters format to new format.

The script converts individual supported_parameters.[number] entries to consolidated
supported_parameters.added/removed entries, removing bogus changes where sets are identical.
"""

import argparse
import json
import sqlite3
import sys
from pathlib import Path
from typing import Dict, Set, Tuple, Optional, Any


def extract_supported_parameters(changes_data: Dict[str, Any]) -> Tuple[Set[str], Set[str]]:
    """
    Extract old and new supported parameters from changes JSON.
    
    Returns:
        Tuple of (old_set, new_set) containing parameter names
    """
    old_params = set()
    new_params = set()
    
    for key, value in changes_data.items():
        if key.startswith("supported_parameters.") and key[21:].isdigit():
            if "old" in value and value["old"] is not None:
                old_params.add(value["old"])
            if "new" in value and value["new"] is not None:
                new_params.add(value["new"])
    
    return old_params, new_params


def remove_old_supported_parameters(changes_data: Dict[str, Any]) -> Dict[str, Any]:
    """Remove all supported_parameters.[number] entries from changes data."""
    return {
        key: value for key, value in changes_data.items()
        if not (key.startswith("supported_parameters.") and key[21:].isdigit())
    }


def create_new_format(old_params: Set[str], new_params: Set[str]) -> Dict[str, Any]:
    """
    Create new format entries for supported_parameters changes.
    
    Returns:
        Dictionary with supported_parameters.added and/or supported_parameters.removed
    """
    result = {}
    
    added = new_params - old_params
    removed = old_params - new_params
    
    if added:
        result["supported_parameters.added"] = {
            "new": sorted(list(added)),
            "old": None
        }
    
    if removed:
        result["supported_parameters.removed"] = {
            "new": None,
            "old": sorted(list(removed))
        }
    
    return result


def process_row(row_id: str, timestamp: str, changes_json: str, dry_run: bool = True) -> Tuple[bool, Optional[str], str]:
    """
    Process a single database row.
    
    Returns:
        Tuple of (should_update, new_changes_json, action_description)
    """
    try:
        changes_data = json.loads(changes_json)
    except json.JSONDecodeError as e:
        return False, None, f"Error parsing JSON: {e}"
    
    # Extract supported parameters
    old_params, new_params = extract_supported_parameters(changes_data)
    
    if not old_params and not new_params:
        return False, None, "No supported_parameters changes found"
    
    # Check if sets are identical (bogus change)
    if old_params == new_params:
        # Remove bogus entries
        cleaned_data = remove_old_supported_parameters(changes_data)
        
        if not cleaned_data:
            action = "DELETE (no other changes remain)"
            return True, None, action
        else:
            new_json = json.dumps(cleaned_data, sort_keys=True)
            action = f"REMOVE bogus supported_parameters changes (sets identical: {sorted(old_params)})"
            return True, new_json, action
    
    else:
        # Convert to new format
        cleaned_data = remove_old_supported_parameters(changes_data)
        new_format_data = create_new_format(old_params, new_params)
        cleaned_data.update(new_format_data)
        
        new_json = json.dumps(cleaned_data, sort_keys=True)
        
        added = new_params - old_params
        removed = old_params - new_params
        action_parts = []
        if added:
            action_parts.append(f"added: {sorted(added)}")
        if removed:
            action_parts.append(f"removed: {sorted(removed)}")
        action = f"CONVERT to new format ({', '.join(action_parts)})"
        
        return True, new_json, action


def main():
    parser = argparse.ArgumentParser(
        description="Migrate SQLite changes table from old to new supported_parameters format"
    )
    parser.add_argument(
        "database",
        type=Path,
        help="Path to SQLite database file"
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Execute changes (default is dry-run mode)"
    )
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="Show detailed output for each processed row"
    )
    
    args = parser.parse_args()
    
    if not args.database.exists():
        print(f"Error: Database file {args.database} does not exist", file=sys.stderr)
        sys.exit(1)
    
    dry_run = not args.execute
    
    if dry_run:
        print("🔍 DRY RUN MODE - No changes will be made to the database")
        print("Use --execute to apply changes")
    else:
        print("⚠️  EXECUTE MODE - Changes will be written to the database")
    
    print(f"Processing database: {args.database}")
    print()
    
    try:
        conn = sqlite3.connect(args.database)
        cursor = conn.cursor()
        
        # Get all rows with changes
        cursor.execute("SELECT id, timestamp, changes FROM changes ORDER BY timestamp, id")
        rows = cursor.fetchall()
        
        stats = {
            "total": len(rows),
            "processed": 0,
            "updated": 0,
            "deleted": 0,
            "errors": 0
        }
        
        updates = []  # Store updates for batch execution
        deletes = []  # Store deletes for batch execution
        
        for row_id, timestamp, changes_json in rows:
            stats["processed"] += 1
            
            should_update, new_changes_json, action = process_row(row_id, timestamp, changes_json, dry_run)
            
            if should_update:
                if new_changes_json is None:
                    # Delete row
                    deletes.append((row_id, timestamp))
                    stats["deleted"] += 1
                    if args.verbose or dry_run:
                        print(f"Row {row_id}@{timestamp}: {action}")
                else:
                    # Update row
                    updates.append((new_changes_json, row_id, timestamp))
                    stats["updated"] += 1
                    if args.verbose or dry_run:
                        print(f"Row {row_id}@{timestamp}: {action}")
            else:
                if "Error" in action:
                    stats["errors"] += 1
                    print(f"Row {row_id}@{timestamp}: {action}", file=sys.stderr)
                elif args.verbose:
                    print(f"Row {row_id}@{timestamp}: SKIP - {action}")
        
        # Execute changes if not in dry-run mode
        if not dry_run and (updates or deletes):
            print(f"\nApplying changes...")
            
            if updates:
                cursor.executemany(
                    "UPDATE changes SET changes = ? WHERE id = ? AND timestamp = ?",
                    updates
                )
            
            if deletes:
                cursor.executemany(
                    "DELETE FROM changes WHERE id = ? AND timestamp = ?",
                    deletes
                )
            
            conn.commit()
            print("✅ Changes applied successfully")
        
        # Print summary
        print(f"\n📊 Summary:")
        print(f"  Total rows: {stats['total']}")
        print(f"  Processed: {stats['processed']}")
        print(f"  Updated: {stats['updated']}")
        print(f"  Deleted: {stats['deleted']}")
        print(f"  Errors: {stats['errors']}")
        
        if dry_run and (stats["updated"] > 0 or stats["deleted"] > 0):
            print(f"\nRun with --execute to apply these changes to the database.")
        
    except sqlite3.Error as e:
        print(f"Database error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == "__main__":
    main()