export default function HealthPage() {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>SmartAfter Health Check</h1>
      <p>✅ Application is running</p>
      <p>✅ Next.js is working</p>
      <p>✅ Vercel deployment successful</p>
      <p>Timestamp: {new Date().toISOString()}</p>
    </div>
  );
}

export const metadata = {
  title: 'SmartAfter - Health Check',
  description: 'Application health status',
};
