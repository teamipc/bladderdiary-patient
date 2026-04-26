export default function Disclaimer({ text }: { text: string }) {
  return (
    <p className="text-[11px] text-ipc-400 leading-relaxed border-t border-ipc-100 pt-4 mt-8">
      {text}
    </p>
  );
}
