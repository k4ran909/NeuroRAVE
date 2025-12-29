// type Props = {
//   containerRef:  React.MutableRefObject<HTMLElement | null>,
//   editorRef:  React.MutableRefObject<HTMLElement | null>,
//   init: () => void
// }
export function Code(Props) {
  const { editorRef, containerRef, init } = Props;

  return (
    <section
      className={'text-foreground cursor-text pb-0 overflow-auto grow overscroll-none'}
      id="code"
      ref={(el) => {
        containerRef.current = el;
        if (!editorRef.current) {
          init();
        }
      }}
    ></section>
  );
}
