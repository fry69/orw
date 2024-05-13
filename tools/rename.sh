#!/usr/bin/env bash

# Function to recursively rename files
rename_files() {
    local source_prefix="$1"
    local target_prefix="$2"
    local dry_run="$3"

    local files_found=0

    while IFS= read -r -d '' file; do
        # Extract the filename and extension
        local filename="${file##*/}"
        local extension="${filename#*.}"

        # Construct the new filename
        local new_filename="${target_prefix}.$extension"

        # Print the proposed rename
        echo "Renaming: $file -> $(dirname "$file")/$new_filename"
        ((files_found++))

        # Execute the rename if not in dry run mode
        if [ "$dry_run" != "true" ]; then
            mv "$file" "$(dirname "$file")/$new_filename"
        fi
    done < <(find . -type f -name "${source_prefix}.*" -print0)

    if [ "$files_found" -gt 0 ]; then
        if [ "$dry_run" = "true" ]; then
            echo "Dry run completed. $files_found files would have been renamed."
        else
            echo "$files_found files were renamed."
        fi
    else
        echo "No files matching the pattern '${source_prefix}.*' were found."
    fi
}

# Check if the required arguments are provided
if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <source_prefix> <target_prefix>"
    exit 1
fi

# Get the source prefix and target prefix from the command line
source_prefix="$1"
target_prefix="$2"

# Perform a dry run first
rename_files "$source_prefix" "$target_prefix" "true"

# Ask for confirmation before executing the renames
read -p "Proceed with the above renames? (y/n) " -r
echo

# Execute the renames if confirmed
if [[ $REPLY =~ ^[Yy]$ ]]; then
    rename_files "$source_prefix" "$target_prefix" "false"
else
    echo "Renames cancelled."
fi
