import { GetStaticProps } from 'next';
import Head from 'next/head';
import App from '../App';

export default function HomePage() {
  return (
    <>
      <Head>
        <title>ALL MVT - Digital Asset Management</title>
        <meta name="description" content="Sistema de Gerenciamento de Ativos Digitais para projetos imobiliários" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <App />
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  return {
    props: {},
  };
};