import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import gulp from 'gulp';
import debug from 'gulp-debug';
import rename from 'gulp-rename';
import through2 from 'through2';
import prettier from 'gulp-prettier';
import customElements from '../custom-elements.json';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REACT_PROP_TYPE = 'DetailedHTMLProps<HTMLAttributes<HTMLElement>, HTMLElement>';

// Convert web component tag to React component name
const toCamelCase = (str) => {
  return str.replace(/-([a-z])/g, function (g) {
    return g[1].toUpperCase();
  });
};

// Create prop interface using custom-elements.json
const createComponentInterface = (component, reactName) => {
  const item = customElements.tags.find((item) => item.name === component);
  const props =
    item.properties &&
    item.properties.map((property) => {
      const readonly =
        property.description && property.description.includes('@readonly') ? 'readonly ' : '';
      const optional =
        property.default || property.type.includes('undefined') || readonly ? '?' : '';

      return (
        `/**\n` +
        `* ${property.description || ''}\n` +
        `*/\n` +
        `${readonly}${property.name}${optional}: ${property.type};\n`
      );
    });

  const events =
    item.events &&
    item.events
      .filter((event) => event.name.startsWith('pharos'))
      .map((event) => {
        const name =
          event.name.charAt(0).toUpperCase() +
          event.name.slice(1).replace(/-([a-z])/g, function (g) {
            return '-' + g[1].toUpperCase();
          });

        return (
          `/**\n` +
          `* ${event.description || ''}\n` +
          `*/\n` +
          `'on${name}'?: (event: CustomEvent) => void;\n`
        );
      });

  return props || events
    ? `interface ${reactName}Props extends ${REACT_PROP_TYPE} {\n` +
        `${(props || []).join('')}` +
        `${(events || []).join('')}` +
        `}`
    : ``;
};

// Define default prop values using custom-elements.json
const createDefaultProps = (component, reactName) => {
  const item = customElements.tags.find((item) => item.name === component);
  const props =
    item.properties &&
    item.properties
      .filter((property) => property.default)
      .map((property) => {
        return `${property.name}: ${property.default},\n`;
      });
  return props ? `${reactName}.defaultProps = {\n` + `${props.join('')}` + `};` : ``;
};

// Import custom and package types for props
const importTypes = (file, filePath) => {
  const types = file.match(/(?<=export type\s+).*?(?=\s*;)/gs);
  if (types) {
    const typeNames = types.map((item) => item.split('=')[0].replace(/{/, '').replace(/}/, ''));
    return `import type { ${typeNames.join(', ')} } from ${filePath};`;
  }
  return '';
};

const buildReact = async () => {
  // Create output directory
  const dir = path.resolve(__dirname, '../src/react-components');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  return await gulp
    .src(
      [
        'src/components/**/pharos-*.ts',
        '!src/components/**/*.css.ts',
        '!src/components/**/*.test.ts',
      ],
      { base: './src/components' }
    )
    .pipe(debug({ title: 'react' }))
    // Wrap each web component with React wrapper
    .pipe(
      through2.obj((file, enc, done) => {
        const webComponentFilePath = file.path.split('components/')[1].split('.ts')[0];
        const webComponentName = webComponentFilePath.split('/').pop();
        const reactComponentName = toCamelCase(
          webComponentName[0].toUpperCase() + webComponentName.substr(1)
        );
        const relativePath = `'../../components/${webComponentFilePath}'`;
        const reactInterface = createComponentInterface(webComponentName, reactComponentName);

        // Generate React component using our wrapper
        file.contents = Buffer.from(`
          import type { FC, DetailedHTMLProps, HTMLAttributes } from 'react';
          import createReactComponent from '../../utils/createReactComponent';
          import ${relativePath};

          ${importTypes(file.contents.toString(enc), relativePath)}

          ${reactInterface}

          export const ${reactComponentName}: FC${
          reactInterface ? `<${reactComponentName}Props>` : `<${REACT_PROP_TYPE}>`
        } = createReactComponent('${webComponentName}');
          ${reactComponentName}.displayName = '${reactComponentName}';

          ${createDefaultProps(webComponentName, reactComponentName)}
        `);

        // Append React component export to index file
        fs.appendFile(
          path.resolve(__dirname, '../src/react-components/index.ts'),
          `export { ${reactComponentName} } from './${webComponentFilePath}';\n`,
          (err) => {
            if (err) throw err;
          }
        );
        done(null, file);
      })
    )
    // Update to TypeScript extension
    .pipe(
      rename((path) => {
        path.extname = '.tsx';
      })
    )
    // Run through prettier
    .pipe(prettier())
    .pipe(gulp.dest('src/react-components'));
};

export { buildReact };