// Karma configuration with coverage thresholds to enforce quality gates in CI
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    browsers: ['ChromeHeadless'],
    singleRun: true,
    reporters: ['progress', 'coverage'],
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      reporters: [
        { type: 'lcov', subdir: '.' },
        { type: 'text-summary' }
      ],
      check: {
        global: {
          statements: 70,
          branches: 45,
          functions: 70,
          lines: 70
        }
      }
    },
    client: {
      clearContext: false
    }
  });
};
