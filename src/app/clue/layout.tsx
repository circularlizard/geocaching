import GameHeader from '@/components/GameHeader';

export default function ClueLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GameHeader />
      <div className="pt-14">{children}</div>
    </>
  );
}
