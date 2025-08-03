CREATE TABLE models (
        id TEXT PRIMARY KEY,
        data TEXT,
        timestamp TEXT
      );
CREATE TABLE migrations (
          version INTEGER PRIMARY KEY
        );
CREATE TABLE IF NOT EXISTS "changes" (
          id TEXT,
          changes TEXT,
          timestamp TEXT,
          type TEXT,
          PRIMARY KEY (id, timestamp)
        );
CREATE TABLE removed_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
CREATE TABLE added_models (
          id TEXT,
          data TEXT,
          timestamp TEXT,
          PRIMARY KEY (id, timestamp)
        );
CREATE TABLE last_api_check (
          id INTEGER PRIMARY KEY,
          last_check TEXT NOT NULL
        , last_status TEXT);
