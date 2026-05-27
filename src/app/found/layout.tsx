import GameHeader from '@/components/GameHeader';

export default function FoundLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <GameHeader />
      <div className="pt-14">{children}</div>
    </>
  );
}
