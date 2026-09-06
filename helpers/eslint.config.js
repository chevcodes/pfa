/* ===========================================================================
 *  ESLint, tuned for THIS project's actual failure history.
 *
 *  Two tiers, and the difference matters:
 *
 *    error   - must be zero. `npm run lint` exits non-zero on any of these, so
 *              a clean run is a real gate rather than a wall of output nobody
 *              reads. Every rule at this level is either already at zero or was
 *              brought to zero when it was added.
 *    warning - worth cleaning, does not block. Mostly dead bindings, which in a
 *              no-bundler app means modules the browser fetches and parses for
 *              nothing.
 *
 *  A linter cannot find the bugs that have hurt this project most - two screens
 *  disagreeing about a figure, a label describing state that has not been
 *  committed yet - because those need the app running and two things compared.
 *  Those are the proof suite's job. What a linter CAN do is catch the class it
 *  already caught once here: a name that resolves at import and throws at call
 *  time. `doExportHistory` sat unbound in the backup banner's own button for
 *  months, through a green suite, until no-undef found it in one run. Pressing
 *  "Back up now" threw, dismissed the banner, and produced no backup.
 *
 *  So the rules below are chosen for that: unbound names, missing validation,
 *  duplicate work, and the artefacts this particular environment produces.
 * ======================================================================== */

import js from '@eslint/js';
import globals from 'globals';
import { defineConfig } from 'eslint/config';

const PROVEN_MODEL_FILES = [
  'application/analysis/goals.js',
  'application/analysis/commitment-income.js',
  'application/analysis/committed-flexible.js',
  'application/analysis/position.js',
  'application/analysis/forecast.js',
  'application/analysis/forecast-accuracy.js',
  'application/analysis/available-now.js',
  'application/analysis/category-intentions.js',
  'application/analysis/tag-totals.js',
  'application/analysis/transaction-splits.js',
  'application/analysis/custom-categories.js',
  'application/analysis/spendable-categories.js',
  'application/analysis/goal-migrate.js',
  'application/analysis/treemap-layout.js',
];

/* Fragments that only ever belong in app-controller.js. Each of these has a
   real provenance: a lossy paste dropped boot plumbing into a render module. */
const PASTE_FRAGMENT_SELECTORS = [
  {
    selector: "CallExpression[callee.name='bootUI']",
    message:
      'bootUI() belongs only in app-controller.js. This looks like a lossy-paste fragment leaked into a module.',
  },
  {
    selector: "MemberExpression[object.name='window'][property.name='__pfaBoot']",
    message:
      'window.__pfaBoot is app-controller.js boot plumbing. It should never appear in a render or analysis module.',
  },
  {
    selector:
      "CallExpression[callee.property.name='addEventListener'][arguments.0.value='DOMContentLoaded']",
    message:
      'DOMContentLoaded wiring belongs in app-controller.js, not a module. Likely a paste fragment.',
  },
];

/* A factory that takes a context must validate it at construction.
 *
 * This is the rule the project paid for. Three factories shipped without
 * requireCtx, and one of them - createAppMessages - was handed a context
 * missing doExportHistory. Nothing complained at boot; the miss surfaced as a
 * ReferenceError months later, when someone pressed "Back up now" on the backup
 * banner, and the banner dismissed itself with no backup made.
 *
 * requireCtx turns that into a loud failure the moment the factory is built.
 * The selector matches an exported create- or make-prefixed function that
 * takes at least one parameter and whose body never calls requireCtx.
 */
const UNVALIDATED_FACTORY_SELECTOR = {
  selector:
    "ExportNamedDeclaration > FunctionDeclaration[id.name=/^(create|make)[A-Z]/][params.length>0]:not(:has(CallExpression[callee.name='requireCtx']))",
  message:
    'A factory that takes a context must call requireCtx(ctx, [...], name) so a missing dependency fails at construction, not on a button press months later.',
};

export default defineConfig([
  {
    ignores: [
      'third-party/**',
      'launcher/logs/**',
      'interface/archive/**',
      '**/*.min.js',
      '**/*.min.mjs',
      'node_modules/**',
    ],
  },

  {
    files: ['**/*.{js,mjs}'],
    plugins: { js },
    extends: ['js/recommended'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    rules: {
      'no-unused-expressions': ['error', { allowShortCircuit: false, allowTernary: false }],
      'no-unreachable': 'error',
      'no-duplicate-imports': 'error',
      'no-self-assign': 'error',
      'no-constant-condition': ['error', { checkLoops: false }],

      /* Both already at zero across the whole repository - added to keep them
         there. In an app that compares money, dates and account keys, `==`
         coercion is a silent wrong answer rather than a crash, and a switch
         with no default is a state nobody decided what to do about. */
      eqeqeq: ['error', 'smart'],
      'default-case': 'error',

      'no-unused-vars': [
        'warn',
        {
          vars: 'all',
          args: 'after-used',
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],

      'no-shadow': 'warn',
      'no-redeclare': 'error',

      'max-depth': ['warn', 7],
      complexity: ['warn', 70],
    },
  },

  {
    files: ['application/**/*.js', 'interface/**/*.js', 'settings/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ResizeObserver: 'readonly',
        IntersectionObserver: 'readonly',
        indexedDB: 'readonly',
        IDBKeyRange: 'readonly',
      },
    },
  },

  {
    files: ['application/analysis/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  {
    files: PROVEN_MODEL_FILES,
    rules: {
      'no-restricted-globals': [
        'error',
        {
          name: 'document',
          message:
            'Proven-model modules must be DOM-free (proofs import them in Node). Keep DOM in ui/.',
        },
        { name: 'window', message: 'Proven-model modules must be DOM-free. Keep DOM in ui/.' },
        {
          name: 'localStorage',
          message:
            'Proven-model modules must be storage-free. Persist via core/storage.js from the app layer.',
        },
        {
          name: 'navigator',
          message:
            'Proven-model modules must be environment-free. Keep browser APIs in ui/ or app-controller.js.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/reporting-*.js', '**/bank-analysis.js'],
              message:
                'Proven-model modules must not import the legacy analysis lineage (reporting-* / bank-analysis.js). Port the small pure helper you need locally, as G did with projectCardPayoff.',
            },
          ],
        },
      ],
    },
  },

  /* Selectors shared by the module tiers below. They are spelled out once and
     spread, because no-restricted-syntax REPLACES its options rather than
     merging them - two config blocks matching the same file would silently
     leave only the last one's selectors in force. */
  {
    files: ['application/ui/**/*.js', 'application/output/**/*.js'],
    rules: {
      'no-restricted-syntax': ['error', ...PASTE_FRAGMENT_SELECTORS, UNVALIDATED_FACTORY_SELECTOR],
    },
  },

  {
    files: ['application/analysis/**/*.js'],
    rules: {
      /* Analysis keeps the paste-fragment guards but NOT the factory rule: its
         make* functions (makeGoal, makeSplit, makeIntention) take plain data,
         not a context object, so there is nothing for requireCtx to check. */
      'no-restricted-syntax': ['error', ...PASTE_FRAGMENT_SELECTORS],
    },
  },

  /* Figures on screen pass through core/money-format.js, which is where the
     privacy gate lives (makeMoney / makeMoneyShort honour figuresHidden). A
     hand-rolled Intl.NumberFormat anywhere else formats a number that the
     "Hide figures" switch cannot reach - and analysis modules used to carry
     exactly those blocks, as money-format.js's own header records. Dates are
     untouched: this restricts the number formatter, not toLocaleString. */
  {
    files: ['application/**/*.js', 'settings/**/*.js'],
    ignores: ['application/core/money-format.js'],
    rules: {
      'no-restricted-properties': [
        'error',
        {
          object: 'Intl',
          property: 'NumberFormat',
          message:
            'Format money through core/money-format.js (makeMoney / makeMoneyShort), which applies the privacy gate. A direct Intl.NumberFormat bypasses "Hide figures".',
        },
      ],
    },
  },

  /* console.log is the one that leaks. This app's promise is that nothing
     leaves the device, and a logged transaction is readable by every devtools
     window and every extension with console access. warn/error/info stay: the
     thirteen in shipped code are all genuine failure diagnostics, and none of
     them prints a figure. sample-data is the dev-only persona loader whose job
     is narrating what it did, so it keeps the lot. */
  {
    files: ['application/**/*.js', 'settings/**/*.js', 'service-worker.js'],
    ignores: ['application/sample-data/**/*.js'],
    rules: {
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
    },
  },

  /* The statement parser escapes its hyphens inside character classes -
     [A-Za-z'.\\-] rather than [A-Za-z'.-]. ESLint calls that unnecessary and it
     is, strictly; it is also deliberate. An escaped hyphen cannot become a
     range by accident when someone adds a character to the class, and these
     regexes read real bank PDFs, where a silent mis-parse is worse than a
     verbose one. The rule is off HERE only, not repo-wide. */
  {
    files: ['application/statements/**/*.js'],
    rules: {
      'no-useless-escape': 'off',
    },
  },

  {
    files: ['application/output/history-codec.js'],
    languageOptions: {
      globals: { ...globals.browser, Buffer: 'readonly' },
    },
  },

  {
    files: ['tests/**/*.mjs'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
      'no-undef': 'error',
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'max-depth': 'off',
      complexity: 'off',
    },
  },

  /* Test files that construct or assert against a DOM.
   *
   * These were reporting 24 "'document' is not defined" / "'self' is not
   * defined" errors, which is noise, and noise is what stops a linter being
   * used: a run that always fails teaches you to ignore the run. The two
   * non-.mjs files under tests/ are a Web Worker and a browser harness, so
   * they get the environments they actually execute in. */
  {
    files: ['tests/proof-worker.js'],
    languageOptions: {
      globals: { ...globals.worker },
    },
  },
  {
    files: ['tests/chart-motion-browser.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser },
    },
  },
  {
    files: ['tests/chart_motion_proof.mjs', 'tests/privacy_sweep_proof.mjs'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },

  {
    files: ['developer-tools/**/*.js', 'helpers/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['service-worker.js'],
    languageOptions: {
      globals: { ...globals.serviceworker },
    },
  },

  {
    files: ['desktop-app/**/*.cjs', '**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  /* iCloud conflict copies, which this project WILL keep producing.
   *
   * The repository lives in iCloud Drive. When two processes write the same
   * file, iCloud does not merge or warn - it forks, leaving a sibling named
   * "<name> 2.js" beside the original. One of those (application/ui/
   * reversible 2.js) sat in the source tree as a stale duplicate module,
   * failed the service-worker precache proof, and was invisible in every diff
   * anyone looked at.
   *
   * A filename is not something ESLint checks, so the file itself is made to
   * fail: any Program node in a file matching the pattern is an error. It is
   * LAST in this array on purpose - a conflict copy of a real module also
   * matches the blocks above, and the last matching block is the one whose
   * no-restricted-syntax options survive.
   */
  {
    files: ['**/* [0-9].{js,mjs,cjs}', '**/* copy.{js,mjs,cjs}', '**/* copy [0-9].{js,mjs,cjs}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Program',
          message:
            'This looks like an iCloud Drive conflict copy ("<name> 2.js"). It is a stale duplicate of a real module - delete it, or rename it if the content is wanted.',
        },
      ],
    },
  },
]);
