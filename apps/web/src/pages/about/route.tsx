import Layout from '~/layouts/Layout';

export default function About({ timestamp }: { timestamp?: Date }) {
  return (
    <Layout timestamp={timestamp}>
      <div className="w-full pt-13 pb-24">
        <div className="h-[1000px]"></div>
      </div>
    </Layout>
  );
}
