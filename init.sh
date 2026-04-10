#!/bin/bash
psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" --set ON_ERROR_STOP=off -f /init.sql