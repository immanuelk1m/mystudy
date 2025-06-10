import React, { useState, useEffect, useRef } from 'react';
import ChatMessageBubble, { ChatMessage } from './ChatMessageBubble';

const initialPodcastMessages: ChatMessage[] = [
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '안녕하세요. 오늘 저희가 함께 살펴볼 자료, 어 선형대수학의 정말 중요한 부분이죠. 행렬과 연립방정식에 대한 건데요. 이게 언뜻 보면 좀 복잡해 보일 수 있는데 오늘 그 핵심을 한번 같이 파악해 보도록 하죠.', timestamp: new Date(Date.now() + 0 * 1000), startTime: 0, endTime: 5 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 맞아요. 행렬이라는 게 기본적으로는 숫자를 이렇게 네모 모양으로 배열한 거잖아요? 근데 이게 그냥 숫자 나열이 아니라 음 굉장히 강력한 도구예요. 특히 변수가 여러 개 얽혀있는 연립 선형 방정식 있잖아요.', timestamp: new Date(Date.now() + 1 * 1000), startTime: 5, endTime: 10 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '아, 그 복잡한 식들요?', timestamp: new Date(Date.now() + 2 * 1000), startTime: 10, endTime: 12 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 그런 것들을 아주 체계적으로 풀 때 정말 유용하죠. 보통 ax는 b 이런 형태로 딱 압축해서 표현하거든요.', timestamp: new Date(Date.now() + 3 * 1000), startTime: 12, endTime: 17 },
  // The following messages with startTime: -1, endTime: -1 are not part of the timed podcast
  // and will be handled differently or removed if not needed for other purposes.
  // For now, they remain in initialPodcastMessages but won't be displayed sequentially with audio.
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '맞아요. AX는 B. 그래서 이번 탐구에서는 이 행렬이 도대체 뭐고, 또 어떤 연산들이 가능한지, 그리고 그 유명한 방법들 있잖아요. 가우스 소거법이나 뭐 LU 분해 같은 걸로 연립방정식의 해, 그러니까 그 X를 어떻게 찾아내는지, 어 그 본질을 파악하는 게 목표입니다.', timestamp: new Date(Date.now() + 4 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 아주 중요한 내용들이죠.', timestamp: new Date(Date.now() + 5 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '자, 그럼 바로 시작해 볼까요? 우선 행렬 기본 연산부터 가볍게 짚고 넘어가죠. 행렬은 행과 열로 이루어진 숫자 배열이고, m행 n열이면 m 크로스 n 행렬. 뭐 이건 기본이고요. 덧셈은 같은 크기 행렬끼리 같은 위치 원소끼리 더하면 되는 거죠.', timestamp: new Date(Date.now() + 6 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 그건 간단하죠. 스칼라곱도 마찬가지고요. 그냥 모든 원소에 똑같은 상수를 곱해주면 되니까요.', timestamp: new Date(Date.now() + 7 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '네. 근데 곱셈이 조금 어 특이하잖아요.', timestamp: new Date(Date.now() + 8 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '맞아요. 행렬 곱셈은 조건이 있죠. 앞에 오는 행렬의 열 개수랑 뒤에 오는 행렬의 행 개수가 같아야만 정의가 되고요.', timestamp: new Date(Date.now() + 9 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '아, 그리고 순서 바꾸면 결과가 완전 달라질 수 있다는 거. AB랑 BA가 같지 않은 경우가 훨씬 많다. 이거 중요하죠.', timestamp: new Date(Date.now() + 10 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '그렇죠. 교환 법칙이 성립 안 하는 게 아주 큰 특징입니다. 아 그리고 전치 행렬이라고 행이랑 열을 서로 바꾼 A의 T제곱 같은 거? 그것도 있고요.', timestamp: new Date(Date.now() + 11 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '네, A 트랜스포즈. 그리고 단위 행렬 I도 빼놓을 수 없죠. 대각선은 1이고 나머진 다 0인 거요. 곱셈에 대한 항등원 역할. AI는 IA는 A.', timestamp: new Date(Date.now() + 12 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네. 이런 행렬의 기본 연산 규칙들이 결국 연립방정식을 푸는 데 다 사용되는 겁니다. 아까 말했던 ax는 b 형태로 돌아가 보면 a가 계수 행렬, x가 우리가 구하려는 미지수 벡터, b는 상수 벡터인 거죠?', timestamp: new Date(Date.now() + 13 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '네. 이 방정식의 해는 어떨 수 있죠? 항상 답이 하나인가요?', timestamp: new Date(Date.now() + 14 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '아니요. 그게 세 가지 경우가 있어요. 해가 딱 하나, 유일하게 존재할 수도 있고요. 아니면 무수히 많을 수도 있고, 심지어 해가 아예 없을 수도 있습니다.', timestamp: new Date(Date.now() + 15 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '아, 그렇군요. 그럼 그 해를 어떻게 찾느냐가 문제인데, 첫 번째 방법으로 가우스 소거법. 이거 정말 유명하죠?', timestamp: new Date(Date.now() + 16 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 가장 기본적이면서도 강력한 방법 중 하나죠.', timestamp: new Date(Date.now() + 17 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '핵심 아이디어가 뭐죠?', timestamp: new Date(Date.now() + 18 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '음, 연립방정식의 해 자체는 바꾸지 않으면서 방정식을 점점 더 단순한 형태로 만들어 가는 거예요. 체계적으로요. 계수 행렬 A랑 상수 벡터 B를 이렇게 합쳐서 쓰는 AB 형태, 이걸 첨가 행렬이라고 부르는데요.', timestamp: new Date(Date.now() + 19 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '네, 첨가행렬.', timestamp: new Date(Date.now() + 20 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '여기에다가 세 가지 기본 행 연산이라는 걸 반복 적용하는 겁니다. 이 연산들은 해를 바꾸지 않거든요. 뭐냐면 두 행을 서로 바꾸거나 한 행 전체 0이 아닌 상수를 곱하거나 한 행의 상수배를 다른 행에 더하는 것. 이 세 가지예요.', timestamp: new Date(Date.now() + 21 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '아하. 이 세 가지 연산을 계속 하다 보면 어떻게 되는 건가요?', timestamp: new Date(Date.now() + 22 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '목표는 행렬을 행 사다리꼴, 로우 에셜론 폼으로 만드는 거예요. 뭐랄까, 아래로 내려갈수록 행의 앞부분에 0이 점점 많아지게 만들고요. 각 행에서 처음으로 0이 아닌 숫자는 1로 만들고, 이걸 선행 1, 리딩 원이라고 하죠. 이 선행 1은 윗 행의 선행 1보다 더 오른쪽에 위치하도록 정리하는 거죠.', timestamp: new Date(Date.now() + 23 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '음. 약간 계단 모양처럼 되겠네요.', timestamp: new Date(Date.now() + 24 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '맞아요. 그렇게 만들고 나면 맨 아래 행부터 변수값을 하나씩 결정해서 위로 올라가면서 나머지 변수들도 착착 구할 수 있어요. 이걸 후진 대입법이라고 부릅니다.', timestamp: new Date(Date.now() + 25 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '오, 그렇군요. 가우스 소거법 아주 체계적이네요. 그럼 두 번째 방법은 역행렬을 이용하는 거였죠?', timestamp: new Date(Date.now() + 26 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 역행렬 A 인버스, A 사다시 일을 사용하는 방법인데요. 이건 조건이 좀 까다롭죠.', timestamp: new Date(Date.now() + 27 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '어떤 조건이죠?', timestamp: new Date(Date.now() + 28 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '일단 정사각 행렬이어야 하고요. 모든 정사각 행렬이 역행렬을 갖는 건 아니에요. 어떤 행렬 A에 대해서 곱했을 때 단위 행렬 I가 되는 그 짝꿍 행렬 A 인버스가 존재할 때만 이 방법을 쓸 수 있습니다. 그런 행렬을 가역적이라고 하고요.', timestamp: new Date(Date.now() + 29 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '아, 가역적일 때만. 그럼 만약 A가 가역적이면 해는 어떻게 구하나요?', timestamp: new Date(Date.now() + 30 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '그럴 땐 아주 간단해요. AX는 B였으니까 양변에 A 인버스를 곱하면 X는 A 인버스 B가 됩니다. 그냥 역행렬을 상수 벡터 B에 곱해주면 해 X가 바로 나오는 거죠.', timestamp: new Date(Date.now() + 31 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '와, 이건 정말 깔끔한데요?', timestamp: new Date(Date.now() + 32 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 이론적으로는 아주 우아하죠. 하지만 역행렬을 구하는 계산 자체가 좀 번거로울 수 있고, 또 역행렬이 존재하지 않으면 아예 쓸 수가 없다는 단점이 있죠.', timestamp: new Date(Date.now() + 33 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '그렇죠. 그럼 가우스 소거법이 좀 더 범용적인 방법이라고 할 수 있겠네요.', timestamp: new Date(Date.now() + 34 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '정확합니다. 가우스 소거법은 해가 존재하기만 한다면 어떤 형태든 찾아낼 수 있는 훨씬 더 일반적인 알고리즘이라고 볼 수 있어요.', timestamp: new Date(Date.now() + 35 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '자, 그럼 마지막으로 LU 분해. 이건 또 뭔가요? 이름부터 좀 어려운데요.', timestamp: new Date(Date.now() + 36 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: 'LU 분해는 이것도 정사각 행렬 A에 주로 적용하는데요. A를 두 개의 특별한 행렬, 즉 아래 삼각형 L 로우어와 위 삼각형 U 어퍼의 곱으로 나타내는 거예요. A = LU 이렇게요.', timestamp: new Date(Date.now() + 37 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: 'L은 아래쪽 삼각형 모양, U는 위쪽 삼각형 모양 행렬이라는 거죠?', timestamp: new Date(Date.now() + 38 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 맞아요. L은 주 대각선 위쪽이 다 0이고, U는 주 대각선 아래쪽이 다 0인 행렬을 말해요.', timestamp: new Date(Date.now() + 39 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '근데 굳이 이렇게 A를 L하고 U로 쪼개는 이유가 뭔가요? 그냥 A로 풀면 안 되나?', timestamp: new Date(Date.now() + 40 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '아, 그게 아주 좋은 질문인데요. LU 분해가 특히 유용한 상황이 있어요. 바로 같은 행렬 A에 대해서 상수 벡터 B만 계속 바꿔가면서 여러 번 풀어야 할 때예요.', timestamp: new Date(Date.now() + 41 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '아, 예를 들면 어떤 시스템은 그대로인데 입력값만 계속 바뀔 때.', timestamp: new Date(Date.now() + 42 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '그렇죠. 그럴 때 매번 가우스 소거법을 새로 하는 것보다 A를 한 번만 LU로 분해해 놓으면 그 다음부터는 훨씬 계산이 빨라져요. AX = B가 LUX = B가 되니까 이걸 LY = B 먼저 풀고 이건 아래 삼각형이라 전진 대입으로 쉽게 풀려요. 그다음에 UX = Y를 풀면 이건 위 삼각형이라 후진 대입으로 쉽게 풀리죠.', timestamp: new Date(Date.now() + 43 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '오, 그러니까 복잡한 문제를 두 개의 쉬운 문제로 나눠 푸는 거군요. 효율적이겠네요.', timestamp: new Date(Date.now() + 44 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네, 맞습니다. 특히 컴퓨터로 대규모 연립 방정식을 풀 때 이 LU 분해의 효율성이 빛을 발하죠.', timestamp: new Date(Date.now() + 45 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '와, 정말 신기하네요. 오늘 저희가 행렬의 기본 정의랑 연산부터 시작해서 연립 방정식을 그 ax=b 형태로 표현하고 또 이걸 푸는 다양한 방법들, 가우스 소거법, 역행렬 이용법, 그리고 방금 본 효율적인 LU분해까지. 어 핵심적인 내용들을 쭉 훑어봤습니다. 이런 수학적인 도구들이 복잡해 보이는 시스템을 어떻게 체계적으로 다룰 수 있게 하는지 좀 감을 잡으셨으면 좋겠네요.', timestamp: new Date(Date.now() + 46 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네. 여기서 한 가지 더 생각해 볼 만한 재미있는 점이 있는 것 같아요. 아까 가우스 소거법에서 쓴 기본 행 연산들이요. 그 연산들은 분명히 행렬의 모양, 그러니까 방정식을 표현하는 겉모습은 계속 바꾸잖아요. 그런데도 신기하게 해 자체는 변하지 않죠.', timestamp: new Date(Date.now() + 47 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '아, 맞아요. 해는 그대로 유지됐죠.', timestamp: new Date(Date.now() + 48 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네. 겉모습은 계속 변하는데 그 속에 담긴 본질적인 답, 즉 해는 그대로 유지된다는 사실. 이게 어쩌면 우리가 다루는 이 시스템 안에 어떤 조작을 가해도 변하지 않는 더 근본적인 어떤 속성, 뭐랄까 불변량 같은 게 숨어 있다는 걸 보여주는 건 아닐까요?', timestamp: new Date(Date.now() + 49 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '오, 불변량이요? 흥미로운 관점이네요.', timestamp: new Date(Date.now() + 50 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personB', text: '네. 방정식을 푸는 기술을 넘어서 이런 관점에서 시스템의 본질을 다시 생각해 보는 것도 아주 의미있는 탐구가 될 수 있을 것 같습니다. 다음에 한번 이 부분을 더 깊이 파고들어 보시는 것도 좋지 않을까 싶네요.', timestamp: new Date(Date.now() + 51 * 1000), startTime: -1, endTime: -1 },
  { id: Date.now().toString() + Math.random(), sender: 'personA', text: '정말 깊이 생각해 볼 만한 질문을 던져 주셨네요. 오늘 이 유용한 자료들 덕분에 함께 즐겁게 탐구할 수 있었습니다. 당신의 지적인 여정에 조금이나마 도움이 되었기를 바랍니다.', timestamp: new Date(Date.now() + 52 * 1000), startTime: -1, endTime: -1 },
];

interface PodcastViewProps {
  audioSrc: string;
}

const PodcastView: React.FC<PodcastViewProps> = ({ audioSrc }) => {
  const [allPodcastMessages] = useState<ChatMessage[]>(initialPodcastMessages);
  const [displayedMessages, setDisplayedMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioElementRef = useRef<HTMLAudioElement>(null);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [displayedMessages]);

  useEffect(() => {
    const audio = audioElementRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      let newActiveMessageId: string | null = null;

      // Add new messages to displayedMessages
      const messagesToAdd = allPodcastMessages.filter(
        (msg) =>
          msg.startTime !== -1 && // Ensure it's a timed message
          currentTime >= msg.startTime &&
          !displayedMessages.some((displayedMsg) => displayedMsg.id === msg.id)
      );

      if (messagesToAdd.length > 0) {
        setDisplayedMessages((prev) => [...prev, ...messagesToAdd].sort((a, b) => (a.startTime ?? 0) - (b.startTime ?? 0)));
      }

      // Determine active message from allPodcastMessages (or displayedMessages)
      // For now, let's find the latest message in displayedMessages that fits the current time
      const currentActiveMessages = [...displayedMessages] // Consider all visible messages
        .filter(msg => msg.startTime !== -1 && msg.endTime !== -1 && currentTime >= msg.startTime && currentTime < msg.endTime)
        .sort((a,b) => (b.startTime ?? 0) - (a.startTime ?? 0)); // Get the latest one

      if (currentActiveMessages.length > 0) {
        newActiveMessageId = currentActiveMessages[0].id;
      }
      setActiveMessageId(newActiveMessageId);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    // Reset displayed messages when audio source changes or component unmounts
    const handleAudioReset = () => {
      setDisplayedMessages([]);
      setActiveMessageId(null);
    }
    audio.addEventListener('loadedmetadata', handleAudioReset); // Reset when new audio loads
    audio.addEventListener('ended', handleAudioReset); // Reset when audio ends


    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleAudioReset);
      audio.removeEventListener('ended', handleAudioReset);
    };
  }, [allPodcastMessages, displayedMessages]);

  useEffect(() => {
    if (activeMessageId) {
      const activeMessageElement = document.getElementById(activeMessageId);
      activeMessageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeMessageId]);




  return (
    <div className="flex flex-col h-full p-4 bg-background">
      <h2 className="text-xl font-semibold mb-2 text-foreground">팟캐스트 대화</h2>
      {audioSrc && (
        <div className="mb-2">
          <audio ref={audioElementRef} controls src={audioSrc} className="w-full" id="podcast-audio-player">
            Your browser does not support the audio element.
          </audio>
        </div>
      )}
      <div className="flex-grow overflow-y-auto mb-4 p-3 rounded-lg border bg-card text-card-foreground shadow-sm">
        {displayedMessages.length === 0 && (
          <p className="text-muted-foreground text-center py-4">팟캐스트가 곧 시작됩니다...</p>
        )}
        {displayedMessages.map((msg) => (
          <div key={msg.id} id={msg.id}>
            <ChatMessageBubble message={msg} isActive={msg.id === activeMessageId} />
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

    </div>
  );
};

export default PodcastView;