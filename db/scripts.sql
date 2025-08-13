CREATE TABLE projects (
    project_id integer NOT NULL,
    user_id integer NOT NULL,
    year integer NOT NULL,
    january real DEFAULT 0,
    february real DEFAULT 0,
    march real DEFAULT 0,
    april real DEFAULT 0,
    may real DEFAULT 0,
    june real DEFAULT 0,
    july real DEFAULT 0,
    august real DEFAULT 0,
    september real DEFAULT 0,
    october real DEFAULT 0,
    november real DEFAULT 0,
    december real DEFAULT 0,
    CONSTRAINT projects_pkey PRIMARY KEY (project_id, user_id, year)
);

CREATE TABLE crm (
    issue_id integer NOT NULL,
    assigned_to integer NOT NULL,
    year integer NOT NULL,
    january real DEFAULT 0,
    february real DEFAULT 0,
    march real DEFAULT 0,
    april real DEFAULT 0,
    may real DEFAULT 0,
    june real DEFAULT 0,
    july real DEFAULT 0,
    august real DEFAULT 0,
    september real DEFAULT 0,
    october real DEFAULT 0,
    november real DEFAULT 0,
    december real DEFAULT 0,
    CONSTRAINT crm_pkey PRIMARY KEY (issue_id, assigned_to, year)
)

CREATE TABLE opportunities
(
    opportunity_id uuid NOT NULL DEFAULT gen_random_uuid(),
    user_id integer NOT NULL,
    year integer NOT NULL,
    name text COLLATE pg_catalog."default" NOT NULL,
    january real DEFAULT 0,
    february real DEFAULT 0,
    march real DEFAULT 0,
    april real DEFAULT 0,
    may real DEFAULT 0,
    june real DEFAULT 0,
    july real DEFAULT 0,
    august real DEFAULT 0,
    september real DEFAULT 0,
    october real DEFAULT 0,
    november real DEFAULT 0,
    december real DEFAULT 0,
    CONSTRAINT opportunities_pkey PRIMARY KEY (opportunity_id)
)

CREATE TABLE offers
(
    offer_id integer NOT NULL,
    user_id integer NOT NULL,
    year integer NOT NULL,
    january real DEFAULT 0,
    february real DEFAULT 0,
    march real DEFAULT 0,
    april real DEFAULT 0,
    may real DEFAULT 0,
    june real DEFAULT 0,
    july real DEFAULT 0,
    august real DEFAULT 0,
    september real DEFAULT 0,
    october real DEFAULT 0,
    november real DEFAULT 0,
    december real DEFAULT 0,
    CONSTRAINT offers_pkey PRIMARY KEY (offer_id, user_id, year)
)

CREATE TABLE working_time
(
    user_id integer NOT NULL,
    year integer NOT NULL,
    january real,
    february real,
    march real,
    april real,
    may real,
    june real,
    july real,
    august real,
    september real,
    october real,
    november real,
    december real,
    CONSTRAINT working_time_pkey PRIMARY KEY (user_id, year)
)

CREATE TABLE users_in_offers
(
    offer_id integer NOT NULL,
    user_id integer NOT NULL,
    CONSTRAINT users_in_offers_pkey PRIMARY KEY (offer_id, user_id)
)