
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ProfileData {
  fullName: string;
  email: string;
  phone: string;
  education: EducationEntry[];
  experience: ExperienceEntry[];
  skills: string[];
}

interface EducationEntry {
  id: string;
  institution: string;
  degree: string;
  graduationDate: string;
}

interface ExperienceEntry {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  description: string;
}

const defaultProfile: ProfileData = {
  fullName: "",
  email: "",
  phone: "",
  education: [
    {
      id: "edu-1",
      institution: "",
      degree: "",
      graduationDate: "",
    },
  ],
  experience: [
    {
      id: "exp-1",
      company: "",
      position: "",
      startDate: "",
      endDate: "",
      description: "",
    },
  ],
  skills: [],
};

export default function ProfileForm() {
  const [profile, setProfile] = useState<ProfileData>(defaultProfile);
  const [skillInput, setSkillInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Check if user is authenticated and load profile data
  useEffect(() => {
    const user = localStorage.getItem("careerAI-user");
    if (!user) {
      navigate("/");
      return;
    }

    // Load profile data if exists
    const savedProfile = localStorage.getItem("careerAI-profile");
    if (savedProfile) {
      try {
        const parsedProfile = JSON.parse(savedProfile);
        setProfile(parsedProfile);
      } catch (error) {
        console.error("Failed to parse profile data", error);
      }
    } else {
      // Set default name and email from user data
      try {
        const userData = JSON.parse(user);
        setProfile(prev => ({
          ...prev,
          fullName: userData.name || "",
          email: userData.email || "",
        }));
      } catch (error) {
        console.error("Failed to parse user data", error);
      }
    }
  }, [navigate]);

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      // In a real app, this would save to Firebase
      localStorage.setItem("careerAI-profile", JSON.stringify(profile));
      
      setTimeout(() => {
        toast({
          title: "Profile saved",
          description: "Your profile has been updated successfully.",
        });
        setIsLoading(false);
      }, 1000);
    } catch (error) {
      toast({
        title: "Error saving profile",
        description: "There was an error saving your profile. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const addEducation = () => {
    setProfile(prev => ({
      ...prev,
      education: [
        ...prev.education,
        {
          id: `edu-${Date.now()}`,
          institution: "",
          degree: "",
          graduationDate: "",
        },
      ],
    }));
  };

  const updateEducation = (id: string, field: keyof EducationEntry, value: string) => {
    setProfile(prev => ({
      ...prev,
      education: prev.education.map(edu => 
        edu.id === id ? { ...edu, [field]: value } : edu
      ),
    }));
  };

  const removeEducation = (id: string) => {
    if (profile.education.length > 1) {
      setProfile(prev => ({
        ...prev,
        education: prev.education.filter(edu => edu.id !== id),
      }));
    } else {
      toast({
        title: "Cannot remove",
        description: "You must have at least one education entry.",
        variant: "destructive",
      });
    }
  };

  const addExperience = () => {
    setProfile(prev => ({
      ...prev,
      experience: [
        ...prev.experience,
        {
          id: `exp-${Date.now()}`,
          company: "",
          position: "",
          startDate: "",
          endDate: "",
          description: "",
        },
      ],
    }));
  };

  const updateExperience = (id: string, field: keyof ExperienceEntry, value: string) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.map(exp => 
        exp.id === id ? { ...exp, [field]: value } : exp
      ),
    }));
  };

  const removeExperience = (id: string) => {
    if (profile.experience.length > 1) {
      setProfile(prev => ({
        ...prev,
        experience: prev.experience.filter(exp => exp.id !== id),
      }));
    } else {
      toast({
        title: "Cannot remove",
        description: "You must have at least one experience entry.",
        variant: "destructive",
      });
    }
  };

  const addSkill = () => {
    if (skillInput.trim() && !profile.skills.includes(skillInput.trim())) {
      setProfile(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setProfile(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill),
    }));
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Professional Profile</CardTitle>
        <CardDescription>
          Update your professional information to optimize your AI-generated resumes and interview responses.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="personal">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="personal">Personal Info</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="experience">Experience & Skills</TabsTrigger>
          </TabsList>
          
          <TabsContent value="personal" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label htmlFor="fullName" className="text-sm font-medium">Full Name</label>
              <Input 
                id="fullName" 
                value={profile.fullName}
                onChange={(e) => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                placeholder="John Doe"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">Email</label>
              <Input 
                id="email" 
                type="email"
                value={profile.email}
                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                placeholder="john.doe@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <label htmlFor="phone" className="text-sm font-medium">Phone Number</label>
              <Input 
                id="phone" 
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(123) 456-7890"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="education" className="space-y-6 mt-4">
            {profile.education.map((edu, index) => (
              <div key={edu.id} className="space-y-4 p-4 border rounded-md">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium">Education #{index + 1}</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => removeEducation(edu.id)}
                    disabled={profile.education.length <= 1}
                  >
                    Remove
                  </Button>
                </div>
                
                <div className="space-y-2">
                  <label htmlFor={`institution-${edu.id}`} className="text-sm font-medium">Institution</label>
                  <Input 
                    id={`institution-${edu.id}`}
                    value={edu.institution}
                    onChange={(e) => updateEducation(edu.id, "institution", e.target.value)}
                    placeholder="University of Technology"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor={`degree-${edu.id}`} className="text-sm font-medium">Degree</label>
                  <Input 
                    id={`degree-${edu.id}`}
                    value={edu.degree}
                    onChange={(e) => updateEducation(edu.id, "degree", e.target.value)}
                    placeholder="Bachelor of Science in Computer Science"
                  />
                </div>
                
                <div className="space-y-2">
                  <label htmlFor={`graduation-${edu.id}`} className="text-sm font-medium">Graduation Date</label>
                  <Input 
                    id={`graduation-${edu.id}`}
                    value={edu.graduationDate}
                    onChange={(e) => updateEducation(edu.id, "graduationDate", e.target.value)}
                    placeholder="May 2022"
                  />
                </div>
              </div>
            ))}
            
            <Button onClick={addEducation} variant="outline" className="w-full">
              Add Education
            </Button>
          </TabsContent>
          
          <TabsContent value="experience" className="space-y-6 mt-4">
            <div className="space-y-4">
              <h3 className="font-medium">Work Experience</h3>
              
              {profile.experience.map((exp, index) => (
                <div key={exp.id} className="space-y-4 p-4 border rounded-md">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Experience #{index + 1}</h4>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeExperience(exp.id)}
                      disabled={profile.experience.length <= 1}
                    >
                      Remove
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor={`company-${exp.id}`} className="text-sm font-medium">Company</label>
                    <Input 
                      id={`company-${exp.id}`}
                      value={exp.company}
                      onChange={(e) => updateExperience(exp.id, "company", e.target.value)}
                      placeholder="ABC Company"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor={`position-${exp.id}`} className="text-sm font-medium">Position</label>
                    <Input 
                      id={`position-${exp.id}`}
                      value={exp.position}
                      onChange={(e) => updateExperience(exp.id, "position", e.target.value)}
                      placeholder="Software Engineer"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor={`start-${exp.id}`} className="text-sm font-medium">Start Date</label>
                      <Input 
                        id={`start-${exp.id}`}
                        value={exp.startDate}
                        onChange={(e) => updateExperience(exp.id, "startDate", e.target.value)}
                        placeholder="Jan 2020"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <label htmlFor={`end-${exp.id}`} className="text-sm font-medium">End Date</label>
                      <Input 
                        id={`end-${exp.id}`}
                        value={exp.endDate}
                        onChange={(e) => updateExperience(exp.id, "endDate", e.target.value)}
                        placeholder="Present"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label htmlFor={`description-${exp.id}`} className="text-sm font-medium">Description</label>
                    <Textarea 
                      id={`description-${exp.id}`}
                      value={exp.description}
                      onChange={(e) => updateExperience(exp.id, "description", e.target.value)}
                      placeholder="Describe your responsibilities and achievements..."
                      rows={4}
                    />
                  </div>
                </div>
              ))}
              
              <Button onClick={addExperience} variant="outline" className="w-full">
                Add Experience
              </Button>
            </div>
            
            <div className="space-y-4 mt-8">
              <h3 className="font-medium">Skills</h3>
              
              <div className="flex gap-2">
                <Input 
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill (e.g., JavaScript, Project Management)"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button onClick={addSkill} type="button">Add</Button>
              </div>
              
              <div className="flex flex-wrap gap-2 mt-2">
                {profile.skills.map((skill) => (
                  <div key={skill} className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full flex items-center gap-1">
                    <span>{skill}</span>
                    <button 
                      onClick={() => removeSkill(skill)}
                      className="rounded-full w-4 h-4 flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {profile.skills.length === 0 && (
                  <p className="text-sm text-muted-foreground">Add skills to enhance your profile</p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSaveProfile} disabled={isLoading} className="ml-auto">
          {isLoading ? "Saving..." : "Save Profile"}
        </Button>
      </CardFooter>
    </Card>
  );
}
