import React from 'react';
import FeatureComparisonTable from '@/components/premium/FeatureComparisonTable'; // 주석 해제
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const PremiumPlanPage: React.FC = () => {
  return (
    <div className="container mx-auto py-12 px-4 md:px-6">
      {/* 1. 히어로 섹션 */}
      <section className="text-center py-16 md:py-24 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-xl">
        <h1 className="text-4xl md:text-6xl font-bold mb-4">학습의 한계를 넘어, 잠재력을 폭발시키세요!</h1>
        <p className="text-lg md:text-xl mb-8">아인슈타인 프리미엄: 당신의 학습 효율을 극대화하는 가장 스마트한 방법</p>
        <img src="/placeholder.svg" alt="서비스 소개 이미지" className="mx-auto mb-8 w-full max-w-2xl h-auto rounded-md shadow-lg" />
        <Button size="lg" variant="secondary">프리미엄 플랜 자세히 보기</Button>
      </section>

      {/* 2. 문제 제기 및 공감대 형성 */}
      <section className="py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">혹시 당신도 이런 어려움을 겪고 있나요?</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            "방대한 학습 자료 정리의 어려움",
            "핵심 내용 파악의 어려움",
            "단순 암기 위주의 비효율적인 학습 방식",
            "개인에게 최적화되지 않은 학습 경험",
            "시험 기간의 압박감과 불안함",
          ].map((problem, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle>문제점 {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{problem}</p>
              </CardContent>
            </Card>
          ))}</div>
        <p className="text-center mt-8 text-lg">아인슈타인은 이러한 학습의 어려움을 깊이 이해합니다.</p>
      </section>

      {/* 3. 아인슈타인 서비스 소개 */}
      <section className="py-16 md:py-24 bg-slate-50 rounded-lg">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">AI가 만드는 학습의 혁신, 아인슈타인</h2>
        <p className="text-center text-lg mb-8 max-w-3xl mx-auto">
          아인슈타인은 AI 기술을 통해 학습 자료를 자동으로 분석, 요약, 정리하고 개인 맞춤형 학습 경험을 제공하여 학습 효율을 극대화하는 지능형 학습 지원 플랫폼입니다.
        </p>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            "시간 절약 및 학습 효율 증대",
            "심층적인 내용 이해 지원",
            "개인 맞춤형 학습 경로 제공",
            "자기주도학습 역량 강화",
          ].map((value, index) => (
            <Card key={index} className="bg-white">
              <CardHeader>
                <CardTitle>핵심 가치 {index + 1}</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{value}</p>
              </CardContent>
            </Card>
          ))}</div>
      </section>

      {/* 4. 무료 플랜 소개 */}
      <section className="py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">아인슈타인의 핵심 기능을 무료로 경험하세요!</h2>
        <Card className="max-w-3xl mx-auto">
          <CardHeader>
            <CardTitle>무료 플랜 주요 기능</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>자료 업로드 & 관리:</strong> 월별 제한된 폴더/파일 업로드 (예: 3개 폴더, 총 500MB), 자동 Class 생성 및 기본 분류</li>
              <li><strong>스마트 콘텐츠 변환:</strong> 기본 요약본 제공 (길이/난이도 조절 불가), 자동 목차 생성 (제한된 수준), 핵심 키워드 추출 (일부)</li>
              <li><strong>학습 확인 & 관리:</strong> 챕터당 제한된 수의 AI 퀴즈 자동 생성 (예: 5문제, 객관식 위주), 기본 오답 확인 기능 (해설 미제공)</li>
            </ul>
            <p className="mt-6 text-center">무료 플랜만으로도 아인슈타인의 편리함과 AI 기반 학습 지원의 강력함을 충분히 맛볼 수 있습니다.</p>
            <div className="text-center mt-6">
              <Button size="lg">지금 바로 무료로 시작하기</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 5. 프리미엄 플랜 업그레이드 필요성 강조 */}
      <section className="py-16 md:py-24 bg-purple-50 rounded-lg">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">학습의 다음 레벨로, 아인슈타인 프리미엄</h2>
        <div className="max-w-3xl mx-auto space-y-6">
          <p className="text-lg text-center">단순한 편리함을 넘어, 압도적인 학습 성과를 원한다면?</p>
          <ul className="list-disc pl-6 space-y-2 text-left">
            <li>더 많은 자료를 관리하고 싶으신가요?</li>
            <li>더 깊이 있는 분석과 맞춤형 요약이 필요하신가요?</li>
            <li>다양한 유형의 문제와 상세한 해설로 완벽하게 학습하고 싶으신가요?</li>
          </ul>
          <p className="text-lg text-center font-semibold">아인슈타인 프리미엄으로 당신의 학습 잠재력을 100% 발휘하세요.</p>
        </div>
      </section>

      {/* 6. 무료 vs. 프리미엄 비교표 - 추후 FeatureComparisonTable 컴포넌트로 대체 */}
      <section className="py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">무료 vs. 프리미엄: 당신의 플랜을 선택하세요</h2>
        <div className="text-center p-8 border rounded-lg max-w-4xl mx-auto">
          <FeatureComparisonTable /> {/* 주석 해제 및 플레이스홀더 제거 */}
          <div className="mt-8 flex justify-center gap-4">
            <Button variant="outline" size="lg">무료로 시작하기</Button>
            <Button size="lg">프리미엄 플랜 구독하기</Button>
          </div>
        </div>
      </section>

      {/* 7. 프리미엄 플랜 상세 기능 소개 */}
      <section className="py-16 md:py-24 bg-slate-50 rounded-lg">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">프리미엄 기능 상세 보기: 잠재력을 최대로!</h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {[
            { title: "무제한 자료 업로드 & 고급 관리", content: "무제한 폴더/파일 업로드 (대용량 지원), 고급 분류 및 태깅 기능 (사용자 정의 태그, 자동 태그 추천), 버전 관리/히스토리. 모든 학습 자료를 아인슈타인 하나로! 용량 걱정 없이 체계적으로 관리하세요." },
            { title: "고품질 심층 스마트 콘텐츠 변환", content: "고품질 심층 요약본 (길이/난이도 상세 조절), 상세 목차 및 연관 개념 맵 생성, 핵심 키워드 및 설명 심층 제공, 강의 내용 팟캐스트 변환 (MP3 무제한 추출), 표/이미지 내 텍스트 추출 및 분석(OCR 강화), (향후) 예상 문제 유형 자동 생성. 단순 요약을 넘어선 깊이 있는 이해! 이동 중에도, 다양한 방식으로 학습 효율을 극대화하세요." },
            { title: "AI 기반 맞춤형 학습 확인 & 관리", content: "무제한 AI 퀴즈 생성 (다양한 유형 지원), 상세 해설 및 관련 자료 링크 제공 (오답노트 심층 관리), 학습 진도 및 취약점 분석 리포트 (개인화 대시보드), (향후) AI 기반 맞춤형 복습 스케줄링. 나만의 AI 학습 코치! 취약점을 정확히 파악하고, 완전 학습을 달성하세요." },
            { title: "프리미엄 전용 부가 기능", content: "광고 제거, 우선 고객 지원, LMS/Notion 등 외부 서비스 연동 (무제한), 오프라인 사용 지원 (일부 기능). 오직 학습에만 집중할 수 있는 쾌적한 환경과 편리한 연동성을 경험하세요." },
          ].map((item, index) => (
            <AccordionItem value={`item-${index + 1}`} key={index}>
              <AccordionTrigger className="text-xl">{item.title}</AccordionTrigger>
              <AccordionContent className="text-base">
                {item.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* 8. VC 설득 포인트 강조 */}
      <section className="py-16 md:py-24 bg-purple-600 text-white rounded-lg shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">왜 아인슈타인에 투자해야 할까요? 학습의 미래입니다.</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto text-left">
          {[
            { title: "명확한 ROI", description: "프리미엄 플랜은 시간 절약은 물론 궁극적으로 학업 성취도 향상이라는 명확한 ROI로 이어집니다." },
            { title: "강력한 Lock-in 효과", description: "한 번 경험한 학생들은 쉽게 이탈하기 어려울 것입니다." },
            { title: "높은 유료 전환율 및 고객 유지율 기대", description: "강력한 유인책을 통해 높은 유료 전환율과 고객 유지율을 달성할 수 있다고 확신합니다." },
            { title: "경쟁사 대비 우위", description: "핵심 기능, 기술력, 비즈니스 모델 등에서 경쟁사보다 뛰어난 점을 간결하게 요약합니다." },
            { title: "시장 성장 잠재력", description: "에듀테크 시장의 성장성과 아인슈타인 서비스의 확장 가능성을 제시합니다." },
          ].map((point, index) => (
            <div key={index} className="p-6 bg-white/10 rounded-lg">
              <h3 className="text-2xl font-semibold mb-2">{point.title}</h3>
              <p>{point.description}</p>
            </div>
          ))}</div>
      </section>

      {/* 9. 시각적 추가 자료 */}
      <section className="py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">데이터로 보는 아인슈타인의 성공</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card>
            <CardHeader><CardTitle>사용자 여정 맵</CardTitle></CardHeader>
            <CardContent>
              <img src="/placeholder.svg" alt="사용자 여정 맵" className="w-full h-auto rounded-md" />
              <p className="mt-2 text-sm text-gray-600">무료 사용자의 프리미엄 전환 여정을 시각화합니다.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>기능 비교표 (상세)</CardTitle></CardHeader>
            <CardContent>
              <img src="/placeholder.svg" alt="기능 비교표" className="w-full h-auto rounded-md" />
              <p className="mt-2 text-sm text-gray-600">경쟁사 대비 아인슈타인의 우위를 보여줍니다.</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>예상 ROI 계산기</CardTitle></CardHeader>
            <CardContent>
              <img src="/placeholder.svg" alt="ROI 계산기" className="w-full h-auto rounded-md" />
              <p className="mt-2 text-sm text-gray-600">프리미엄 플랜의 정량적 가치를 시뮬레이션합니다.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 10. 고객 후기/추천사 */}
      <section className="py-16 md:py-24 bg-slate-50 rounded-lg">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">학생들과 교육 전문가들의 신뢰</h2>
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {[
            { name: "김민지", role: "대학생", review: "아인슈타인 프리미엄 덕분에 시험 기간이 훨씬 수월해졌어요! 복잡한 전공 내용을 이해하는 데 큰 도움이 됐습니다." },
            { name: "박교수", role: "교육 컨설턴트", review: "아인슈타인은 AI를 활용한 학습 혁신의 좋은 예시입니다. 학생들의 자기주도학습 능력을 키우는 데 기여할 것입니다." },
          ].map((testimonial, index) => (
            <Card key={index} className="bg-white">
              <CardContent className="pt-6">
                <p className="italic mb-4">"{testimonial.review}"</p>
                <p className="font-semibold text-right">- {testimonial.name}, {testimonial.role}</p>
              </CardContent>
            </Card>
          ))}</div>
      </section>

      {/* 11. FAQ */}
      <section className="py-16 md:py-24">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">자주 묻는 질문 (FAQ)</h2>
        <Accordion type="single" collapsible className="w-full max-w-3xl mx-auto">
          {[
            { q: "데이터 보안 및 개인정보보호 정책은 어떻게 되나요?", a: "저희는 사용자의 데이터를 안전하게 보호하기 위해 최신 보안 기술을 적용하고 있으며, 관련 법규를 철저히 준수합니다. 자세한 내용은 개인정보처리방침을 참고해주세요." },
            { q: "어떤 종류의 학습 자료를 지원하나요?", a: "PDF, DOCX, PPTX 등 다양한 문서 파일 형식을 지원하며, 텍스트 기반의 학습 자료라면 대부분 활용 가능합니다. 지원 언어는 지속적으로 확대될 예정입니다." },
            { q: "프리미엄 플랜 구독 해지는 쉬운가요?", a: "네, 언제든지 간편하게 구독을 해지하실 수 있습니다. 계정 설정 페이지에서 몇 번의 클릭만으로 해지가 가능하며, 남은 기간 동안은 계속 서비스를 이용하실 수 있습니다." },
          ].map((faq, index) => (
            <AccordionItem value={`faq-${index + 1}`} key={index}>
              <AccordionTrigger className="text-lg">{faq.q}</AccordionTrigger>
              <AccordionContent>
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* 12. Call to Action */}
      <section className="py-16 md:py-24 text-center bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg shadow-xl">
        <h2 className="text-3xl md:text-4xl font-bold mb-8">지금 바로 프리미엄 플랜으로 학습 혁신을 경험하세요!</h2>
        <div className="space-x-4">
          <Button size="lg" variant="secondary">프리미엄 플랜 구독하기</Button> {/* size="xl" -> "lg" 수정 */}
          <Button size="lg" variant="outline" className="text-white border-white hover:bg-white hover:text-purple-600">투자 문의 및 데모 요청</Button> {/* size="xl" -> "lg" 수정 */}
        </div>
      </section>
    </div>
  );
};

export default PremiumPlanPage;