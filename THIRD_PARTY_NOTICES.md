# Third-party notices

Turnspan's own source is MIT-licensed. The production bundle contains the
following third-party runtime components.

## React and React DOM

- Packages: `react`, `react-dom`
- License: MIT
- Copyright: Meta Platforms, Inc. and affiliates
- Source: <https://github.com/facebook/react>

## SQLite Wasm wrapper

- Package: `@sqlite.org/sqlite-wasm`
- Version at initial commit: `3.53.0-build1`
- License: Apache License 2.0
- Source: <https://github.com/sqlite/sqlite-wasm>
- Full license: [LICENSES/Apache-2.0.txt](LICENSES/Apache-2.0.txt)

The wrapped SQLite engine is released into the public domain:
<https://www.sqlite.org/copyright.html>.

## MIT license text for the runtime MIT components

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

## Development-only tooling

The repository also uses Vite (MIT), Vitest (MIT), Playwright (Apache-2.0), and
TypeScript (Apache-2.0) for building and verification. They are not application
runtime services and do not receive session data.

The projects discussed in `docs/research.md` were research references only.
Their code and fixtures were not copied into Turnspan.
