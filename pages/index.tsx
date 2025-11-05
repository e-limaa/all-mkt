import type { GetServerSideProps } from 'next';

const IndexPage = () => null;

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: {
    destination: '/dashboard',
    permanent: false,
  },
});

export default IndexPage;

