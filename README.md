# Neuro RAVE

Live coding patterns on the web
https://strudel.cc/

- Try it here: <https://strudel.cc>
- Docs: <https://strudel.cc/learn>

## Running Locally

After cloning the project, you can run the REPL locally:

1. Install [Node.js](https://nodejs.org/) 18 or newer
2. Install [pnpm](https://pnpm.io/installation)
3. Install dependencies by running the following command:
   ```bash
   pnpm i
   ```
4. Run the development server:
   ```bash
   pnpm dev
   ```

## Compiling Desktop App (.exe)

You can build the standalone desktop application (Neuro RAVE) for Windows using the following steps:

1.  **Ensure Dependencies are Installed:**
    Make sure you have run `pnpm i` in the root directory first.

2.  **Build the Application:**
    Run the build command from the `website` directory:
    ```bash
    cd website
    npm run electron:build
    ```
    *Alternatively, from the root directory:*
    ```bash
    pnpm --filter @strudel/website run electron:build
    ```

3.  **Locate the Output:**
    Once the build completes successfully, you can find the generated files in the following paths:

    *   **Installer (Setup File):**
        `website\dist-electron\Neuro RAVE Setup 0.6.0.exe`
        *(Use this to install the app on your system)*

    *   **portable / Unpacked Version:**
        `website\dist-electron\win-unpacked\Neuro RAVE.exe`
        *(You can run this directly without installation)*

## Using Neuro RAVE In Your Project

This project is organized into many [packages](./packages), which are also available on [npm](https://www.npmjs.com/search?q=%40strudel).

Read more about how to use these in your own project [here](https://strudel.cc/technical-manual/project-start).

You will need to abide by the terms of the [GNU Affero Public Licence v3](LICENSE). As such, Neuro RAVE code can only be shared within free/open source projects under the same license -- see the license for details.

Licensing info for the default sound banks can be found over on the [dough-samples](https://github.com/felixroos/dough-samples/blob/main/README.md) repository.

## Contributing

There are many ways to contribute to this project! See [contribution guide](./CONTRIBUTING.md). You can find the full list of contributors [here](https://codeberg.org/uzu/strudel/activity/contributors).

## Community

There is a #strudel channel on the TidalCycles discord: <https://discord.com/invite/HGEdXmRkzT>

You can also ask questions and find related discussions on the tidal club forum: <https://club.tidalcycles.org/>

The discord and forum is shared with the haskell (tidal) and python (vortex) siblings of this project.

We also have a mastodon account: <a rel="me" href="https://social.toplap.org/@strudel">social.toplap.org/@strudel</a>
