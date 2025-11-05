import dynamic from 'next/dynamic';

const AppPage = dynamic(() => import('../App'), { ssr: false });

export default function Page() {
  return <AppPage />;
}

