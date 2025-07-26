CREATE TABLE changes_new (
    id TEXT,
    changes TEXT,
    timestamp TEXT,
    type TEXT,
    PRIMARY KEY (id, timestamp)
);

INSERT INTO
    changes_new (id, changes, timestamp, type)
SELECT
    id,
    changes,
    timestamp,
    "changed"
FROM
    changes;

DROP TABLE changes;

ALTER TABLE
    changes_new
RENAME TO changes;
