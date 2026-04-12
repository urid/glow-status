Monitor `stderr.log` for errors and fix them as they appear.

Use the `loop` skill to self-pace this monitoring task. On each iteration:

1. Read `D:/Github/glow-status/stderr.log`
2. Scan for new errors or warnings since the last check (ignore lines already seen)
3. If errors are found:
   - Use the `superpowers:systematic-debugging` skill to diagnose and fix each error
   - After fixing, note the fix so you don't re-process the same error
4. If no new errors, schedule the next wakeup in ~30 seconds

Keep a running list of errors already handled so you don't re-fix the same issue. Stop the loop if the user says stop or if the server crashes entirely.
