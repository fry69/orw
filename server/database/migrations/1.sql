CREATE TABLE IF NOT EXISTS models (
    id TEXT PRIMARY KEY,
    data TEXT,
    timestamp TEXT
);

CREATE TABLE IF NOT EXISTS changes (
    id TEXT,
    changes TEXT,
    timestamp TEXT
);

CREATE TABLE IF NOT EXISTS migrations (
    version INTEGER PRIMARY KEY
);
