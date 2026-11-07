/* EduRise — daily Bible verses (KJV, public domain) */
window.EDURISE_VERSES = [
  { ref: "Philippians 4:13", text: "I can do all things through Christ which strengtheneth me." },
  { ref: "Proverbs 1:5", text: "A wise man will hear, and will increase learning; and a man of understanding shall attain unto wise counsels." },
  { ref: "Proverbs 18:15", text: "The heart of the prudent getteth knowledge; and the ear of the wise seeketh knowledge." },
  { ref: "Psalm 119:105", text: "Thy word is a lamp unto my feet, and a light unto my path." },
  { ref: "Joshua 1:9", text: "Be strong and of a good courage; be not afraid, neither be thou dismayed: for the Lord thy God is with thee whithersoever thou goest." },
  { ref: "Jeremiah 29:11", text: "For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end." },
  { ref: "Proverbs 16:3", text: "Commit thy works unto the Lord, and thy thoughts shall be established." },
  { ref: "Ecclesiastes 9:10", text: "Whatsoever thy hand findeth to do, do it with thy might." },
  { ref: "Colossians 3:23", text: "And whatsoever ye do, do it heartily, as to the Lord, and not unto men." },
  { ref: "Isaiah 40:31", text: "But they that wait upon the Lord shall renew their strength; they shall mount up with wings as eagles." },
  { ref: "2 Timothy 1:7", text: "For God hath not given us the spirit of fear; but of power, and of love, and of a sound mind." },
  { ref: "Proverbs 22:29", text: "Seest thou a man diligent in his business? he shall stand before kings; he shall not stand before mean men." },
  { ref: "Daniel 1:17", text: "As for these four children, God gave them knowledge and skill in all learning and wisdom." },
  { ref: "Psalm 32:8", text: "I will instruct thee and teach thee in the way which thou shalt go: I will guide thee with mine eye." },
  { ref: "Proverbs 3:5-6", text: "Trust in the Lord with all thine heart; and lean not unto thine own understanding. In all thy ways acknowledge him, and he shall direct thy paths." }
];
window.EDURISE_VERSE_OF_DAY = function () {
  var list = window.EDURISE_VERSES;
  var day = Math.floor(Date.now() / 86400000);
  return list[day % list.length];
};
