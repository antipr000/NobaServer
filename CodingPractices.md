## Coding practices

###### Do we still need these?

- Use axios for calling server
- IMPORTANT: Don't change keys of joi schema as that also derives DB schema

# The baseline

- Become familiar with https://google.github.io/styleguide/tsguide.html as a baseline. Anything documented below is to either emphasize a standard that often varies or an addition to this baseline.
  **Team - as you read through this, please add to the list below anything that stands out to you as non-obvious or possibly already inconsistent within our codebase.**

# Clarifications & Additions

- Add comments that are meaningful, not just a restating of the obvious
- Use parenthesis, even when optional (e.g. for constructors)
- Use semicolons at the end of lines, even when optional
- Never define variables with `var` - always use `const` or `let`
- Never use they `any` type!

# Consistency

- The abbreviation for `identifier` is always `ID`, not `Id`. If at the start of a varible name, it should be `id`. (e.g. `userID`, `transactionID`, `idAndUsername`)
