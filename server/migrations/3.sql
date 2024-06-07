UPDATE changes
SET changes = (
	SELECT data
	FROM models
	WHERE changes.id = models.id
)
WHERE changes = "{}";

CREATE TABLE IF NOT EXISTS removed_models (
    id TEXT,
    data TEXT,
    timestamp TEXT,
    PRIMARY KEY (id, timestamp)
);

CREATE TABLE IF NOT EXISTS added_models (
    id TEXT,
    data TEXT,
    timestamp TEXT,
    PRIMARY KEY (id, timestamp)
);

INSERT INTO added_models (id, data, timestamp)
    SELECT id, changes, timestamp
    FROM changes WHERE type = "added";


