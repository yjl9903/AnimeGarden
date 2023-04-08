-- Migration number: 0000 	 2023-04-08T18:11:17.915Z

create table team
(
    id   integer not null
        constraint team_pk
            primary key autoincrement,
    name TEXT    not null
);

create table user
(
    id   integer not null
        constraint user_pk
            primary key autoincrement,
    name TEXT    not null
);

create table resource
(
    title     TEXT    not null,
    href      TEXT    not null
        constraint href
            primary key,
    type      TEXT    not null,
    magnet    TEXT    not null,
    size      TEXT    not null,
    createdAt TEXT    not null,
    publisher integer not null,
    fansub    integer
);
