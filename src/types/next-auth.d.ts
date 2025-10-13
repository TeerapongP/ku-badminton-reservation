import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      email: string;
      name: string;
      role: string;
      status: string;
      profile: {
        title_th?: string;
        title_en?: string;
        first_name: string;
        last_name: string;
        nickname?: string;
        gender?: string;
        dob?: Date;
        phone?: string;
        profile_photo_url?: string;
        student_profile?: any;
        staff_profile?: any;
      };
    };
  }

  interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;
    status: string;
    profile: any;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    status: string;
    profile: any;
  }
}