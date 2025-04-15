
import AppLayout from "@/components/Layout/AppLayout";
import ProfileForm from "@/components/Profile/ProfileForm";

const ProfilePage = () => {
  return (
    <AppLayout>
      <div className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">My Professional Profile</h1>
          <p className="text-muted-foreground mt-1">
            Manage your professional information to optimize your AI-generated resumes and interview responses.
          </p>
        </div>
        
        <div className="flex justify-center">
          <ProfileForm />
        </div>
      </div>
    </AppLayout>
  );
};

export default ProfilePage;
