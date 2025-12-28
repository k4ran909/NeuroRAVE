import { useSettings } from '@src/settings.mjs';

const { BASE_URL } = import.meta.env;
const baseNoTrailing = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;

export function WelcomeTab({ context }) {
  const { fontFamily } = useSettings();
  return (
    <div className="prose dark:prose-invert min-w-full pt-2 font-sans pb-8 px-4 " style={{ fontFamily }}>
      <h3>꩜ welcome</h3>
      <p>
        You have found <span className="underline">Neuro <span className="text-sm">RAVE</span></span>, a new live coding platform to write dynamic music
        pieces in the browser! It is free and open-source and made for beginners and experts alike. To get started:
        <br />
        <br />
        <span className="underline">1. hit play</span> - <span className="underline">2. change something</span> -{' '}
        <span className="underline">3. hit update</span>
        {/* <br />
        If you don't like what you hear, try <span className="underline">shuffle</span>! */}
      </p>
      <p>
        {/* To learn more about what this all means, check out the{' '} */}
        To get started, check out the{' '}
        <a href={`${baseNoTrailing}/workshop/getting-started/`} target="_blank">
          interactive tutorial
        </a>
        . Also feel free to join the{' '}
        <a href="https://discord.com/invite/HGEdXmRkzT" target="_blank">
          discord channel
        </a>{' '}
        to ask any questions, give feedback or just say hello.
      </p>
      <h3>꩜ about</h3>
      <p>
        Neuro <span className="text-sm">RAVE</span> is a JavaScript version of tidalcycles, which is a popular live coding language for music, written in
        Haskell. Neuro <span className="text-sm">RAVE</span> is free/open source software: you can redistribute and/or modify it under the terms of the
        GNU Affero General Public License. You can find the source code at codeberg. You can also find licensing info
        for the default sound banks there. Please consider to support this project to ensure ongoing development 💖
      </p>
    </div>
  );
}
