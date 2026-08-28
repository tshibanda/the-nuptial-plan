const path = require('path');

function inlineExpoRouterRoots({ types: t }) {
  const appRoot = path.join(__dirname, 'app');

  return {
    name: 'inline-expo-router-roots',
    visitor: {
      MemberExpression(memberPath, state) {
        const node = memberPath.node;
        if (
          !t.isMemberExpression(node.object) ||
          !t.isIdentifier(node.object.object, { name: 'process' }) ||
          !t.isIdentifier(node.object.property, { name: 'env' }) ||
          !t.isIdentifier(node.property)
        ) {
          return;
        }

        if (node.property.name === 'EXPO_ROUTER_ABS_APP_ROOT') {
          memberPath.replaceWith(t.stringLiteral(appRoot));
          return;
        }

        if (node.property.name === 'EXPO_ROUTER_APP_ROOT') {
          const filename = state.filename || state.file.opts.filename;
          if (!filename) {
            throw new Error(
              'Unable to determine the file path for Expo Router',
            );
          }

          let relativeRoot = path.relative(path.dirname(filename), appRoot);
          if (!relativeRoot.startsWith('.')) {
            relativeRoot = `./${relativeRoot}`;
          }
          memberPath.replaceWith(t.stringLiteral(relativeRoot));
        }
      },
    },
  };
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { unstable_transformImportMeta: true }]],
    plugins: [inlineExpoRouterRoots],
  };
};
