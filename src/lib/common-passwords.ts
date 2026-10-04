/**
 * 推測しやすいパスワードの判定（T007 / FR-003）。
 * 外部サービスにパスワード由来の情報を送らないよう、よく使われるパスワードの一覧と単純な規則で判定する。
 * 一覧は漏えいパスワードの公開集計で上位に入る語をもとにしたもの。必要に応じて追加する。
 */
const COMMON = new Set(
  `
123456 123456789 12345678 1234567890 12345 1234567 111111 000000 123123 654321 666666 888888 121212 112233
password password1 password123 passw0rd p@ssw0rd p@ssword pass1234 pass12345 password! password12
qwerty qwerty123 qwertyuiop qwerty1 1q2w3e4r 1q2w3e4r5t 1qaz2wsx zaq12wsx asdfghjkl asdfgh asdf1234 zxcvbnm
abc123 abcd1234 abcdefg abcdefgh a1b2c3d4 aa123456 aaaaaa aaaaaaaa iloveyou iloveyou1 welcome welcome1
admin admin123 administrator root letmein login loginlogin master monkey dragon sunshine princess football
baseball superman batman trustno1 shadow michael jennifer charlie freedom whatever starwars pokemon
hello123 hellohello test1234 testtest guest1234 changeme default secret secret123 internet computer
japan nippon tokyo osaka sakura doraemon pikachu naruto totoro hello_kitty arigatou daisuki
axis axis1234 axisaxis jobboard
`
    .split(/\s+/)
    .filter(Boolean),
);

/** 推測しやすいパスワードなら true */
export function isWeakPassword(password: string, email?: string): boolean {
  const lower = password.toLowerCase();
  if (COMMON.has(lower)) return true;
  // 同じ文字の繰り返し（aaaaaaaa, 11111111）
  if (/^(.)\1+$/.test(password)) return true;
  // 連続した数字・アルファベット（12345678, abcdefgh, 87654321）
  const seq = "0123456789abcdefghijklmnopqrstuvwxyz";
  if (
    password.length >= 6 &&
    (seq.includes(lower) || seq.split("").reverse().join("").includes(lower))
  ) {
    return true;
  }
  // メールアドレスの @ より前と同じ
  if (email) {
    const local = email.split("@")[0]?.toLowerCase();
    if (local && local.length >= 4 && lower.includes(local)) return true;
  }
  return false;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
