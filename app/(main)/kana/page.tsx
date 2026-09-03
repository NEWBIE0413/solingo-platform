import { auth } from "@/lib/session";

// The Solingo engine (public/kana) runs inside the platform shell. Same origin, so the
// session cookie reaches /api/kana/state and progress belongs to the account.
const KanaPage = async () => {
  await auth.protect();
  return (
    <div className="-mt-6 h-[calc(100vh-50px)] w-full lg:h-screen">
      <iframe
        src="/kana/index.html?course=ja-kana"
        title="히라가나"
        className="h-full w-full border-0"
        allow="microphone; autoplay"
      />
    </div>
  );
};

export default KanaPage;
