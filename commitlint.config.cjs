module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce conventional commit types
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'chore',    // Build process, tooling, deps
        'refactor', // Code change (no feat/fix)
        'test',     // Adding or updating tests
        'style',    // Formatting, whitespace
        'perf',     // Performance improvement
        'ci',       // CI/CD changes
        'revert',   // Revert a previous commit
      ],
    ],
    // Subject must not be empty
    'subject-empty': [2, 'never'],
    // Type must not be empty
    'type-empty': [2, 'never'],
    // Subject must be lowercase
    'subject-case': [2, 'always', 'lower-case'],
    // No period at end of subject
    'subject-full-stop': [2, 'never', '.'],
    // Header max 100 chars
    'header-max-length': [2, 'always', 100],
  },
};
