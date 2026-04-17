"use client";

export default function CustomRedirectPage() {
  const goToDestination = () => {
    window.location.href = "https://gtnmobile-stg.onelink.me/ZQ4a/jehus787";
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-semibold text-primary">
          カスタムリダイレクトページ
        </h1>
        <p className="text-muted-foreground">
          下のボタンを押すと指定先へ遷移します（ミドルウェアなし）。
        </p>
        <button
          type="button"
          onClick={goToDestination}
          className="rounded-md bg-primary px-5 py-2 text-primary-foreground shadow transition-colors hover:bg-primary/90"
        >
          スマートフォン保険に登録する
        </button>
      </div>
    </div>
  );
}
