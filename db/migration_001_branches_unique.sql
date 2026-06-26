-- Migration: add unique constraint on branches(repo_id, name)
ALTER TABLE branches
  ADD CONSTRAINT branches_repo_id_name_unique
  UNIQUE (repo_id, name);
