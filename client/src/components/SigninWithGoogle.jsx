import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth, db } from "../firebase"; 
import { toast } from "react-toastify";
import { setDoc, doc } from "firebase/firestore";

function SigninwithGoogle() {
  const googleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      if (user) {
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          firstName: user.displayName,
          lastName: "",
          photo: user.photoURL,
        });

        toast.success("User logged in successfully!", {
          position: "top-center",
        });

        window.location.href = "/profile";
      }
    } catch (error) {
      console.error("Google Login Error:", error);
      toast.error("Failed to sign in with Google!", {
        position: "bottom-center",
      });
    }
  };

  return (
    <div className="text-center">
      <button
        className="w-full text-blue-400 hover:underline text-lg font-semibold"
        onClick={googleLogin}
      >
        Sign in with Google
      </button>
    </div>
  );
}

export default SigninwithGoogle;
