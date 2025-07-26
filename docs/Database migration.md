You're absolutely right about `node:sqlite` being the official Deno 2 way - I apologize for the confusion. Your assessment of `@marianmeres/migrate` being too heavyweight for your needs is also spot-on, especially since you don't need rollbacks.

Looking at your current implementation, here are several concrete improvements you can make while keeping it lightweight:

## Issues with Current Implementation

1. **Duplicate Migration Definitions**: You have migrations defined in both database.ts and migrations.ts
2. **Initial Setup Logic**: The logic for handling `-1` (no migrations table) is unnecessarily complex
3. **Transaction Safety**: No transaction wrapping for migrations
4. **Error Handling**: Limited error recovery
5. **Logging**: Inconsistent logging

## Suggested Improvements

Let me show you a cleaner, more robust version:
```


Made changes.


```
Now let me add the missing functions and improve the existing ones:
```


Made changes.


```
Good, that function is already correct. Now let me add a few more improvements - validation and better error messages:
````

````


Made changes.

Now let me add the validation call to the main function:
```


Made changes.


```
Now let me check if there are any errors and also suggest removing the duplicate migration system: Great! Now let me also suggest removing the duplicate migration implementation in database.ts since you have a cleaner one now: I see you have two different database systems. Let me check which one is actually being used: I see the issue! You have two different systems:
1. database.ts uses `jsr:@db/sqlite` (the `Database` class)
2. db-migration.ts uses `node:sqlite` (the `DatabaseSync` class)

The app.ts is importing from index.ts which exports from database.ts, but your newer migrations are in the `node:sqlite` system. Let me check what the main app is actually using: ## Key Improvements Made

Here's what I've improved in your migration system:

### 1. **Better Transaction Safety**
```typescript
// Before: No transaction wrapping
migration.up(db);
setCurrentVersion(db, migration.version);

// After: Full transaction with rollback
db.exec("BEGIN TRANSACTION");
migration.up(db);
setCurrentVersion(db, migration.version);
db.exec("COMMIT");
// Rollback on error
```

### 2. **Simplified Logic**
- Removed the confusing `-1` return value logic
- Always ensure migrations table exists upfront
- Cleaner separation of concerns

### 3. **Better Error Handling**
- Transaction rollback on migration failure
- Clear error messages with migration version
- Validation of migration sequence

### 4. **Enhanced Logging**
- Emoji indicators (✅/❌) for success/failure
- Better progress information
- Clearer status messages

### 5. **Added Utility Functions**
```typescript
// Check migration status without applying
const status = getMigrationStatus(db);
console.log(`${status.pendingCount} pending migrations`);
```

### 6. **Migration Validation**
- Ensures migrations are numbered sequentially (1, 2, 3...)
- Prevents gaps in migration sequences

## Additional Recommendations

### Fix the Dual Database System
You currently have two different database implementations. I recommend consolidating to use `node:sqlite` everywhere since it's the official Deno 2 approach: You should update this to use your improved `node:sqlite` system. Would you like me to help you create a unified database layer using `node:sqlite`?

### Optional Enhancements for Later
1. **Migration Files in Separate Directory**: Each migration in its own file
2. **Dry Run Mode**: Check what migrations would be applied
3. **Migration Timestamps**: Track when each migration was applied
4. **Configuration Options**: Enable/disable validation, logging levels

Your current approach is actually quite good - it's lightweight, focused, and fits your needs perfectly. The improvements I've made maintain that simplicity while adding robustness and better error handling.