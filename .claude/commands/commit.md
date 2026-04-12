Run the following steps to commit and push all changes with an auto-generated message:

1. Run `git status` and `git diff HEAD` (or `git diff` if no commits yet) to understand what changed.
2. Stage all changed and untracked files with `git add -A`, excluding anything in `.gitignore`.
3. Write a concise commit message (1–2 sentences) that describes *what changed and why*, based on the actual diff. Use imperative mood (e.g. "Add X", "Update Y", "Fix Z").
4. Commit using a HEREDOC to preserve formatting, with the Co-Authored-By trailer:
   ```
   git commit -m "$(cat <<'EOF'
   <message here>

   Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
5. Push to origin with `git push`.
6. Report the commit hash and message to the user.
