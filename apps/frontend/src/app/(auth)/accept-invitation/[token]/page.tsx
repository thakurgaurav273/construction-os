import { AcceptInvitationForm } from '@/features/auth/components/AcceptInvitationForm';

export default function AcceptInvitationPage({ params }: { params: { token: string } }) {
  return (
    <div className="flex min-h-screen flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
          Join your team
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Set up your SitePilot access to start working with your team.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white px-4 py-8 shadow sm:rounded-lg sm:px-10">
          <AcceptInvitationForm token={params.token} />
        </div>
      </div>
    </div>
  );
}
