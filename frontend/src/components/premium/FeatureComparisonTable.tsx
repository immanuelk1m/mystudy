import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, XCircle, MinusCircle } from 'lucide-react'; // 아이콘 추가

interface Feature {
  feature: string;
  free: string | React.ReactNode;
  premium: string | React.ReactNode;
  premiumDetail?: string;
  freeIcon?: React.ReactNode;
  premiumIcon?: React.ReactNode;
}

const FeatureComparisonTable: React.FC = () => {
  const features: Feature[] = [
    {
      feature: "자료 업로드 & 관리",
      free: "월 3개 폴더, 총 500MB",
      premium: "무제한 폴더/파일, 대용량 지원",
      premiumDetail: "고급 분류, 태깅, 버전 관리",
      freeIcon: <MinusCircle className="text-yellow-500 mx-auto" />,
      premiumIcon: <CheckCircle2 className="text-green-500 mx-auto" />,
    },
    {
      feature: "스마트 콘텐츠 변환 - 요약",
      free: "기본 요약 (조절 불가)",
      premium: "고품질 심층 요약 (상세 조절)",
      premiumDetail: "길이/난이도 조절",
      freeIcon: <MinusCircle className="text-yellow-500 mx-auto" />,
      premiumIcon: <CheckCircle2 className="text-green-500 mx-auto" />,
    },
    {
      feature: "스마트 콘텐츠 변환 - 목차/키워드",
      free: "기본 목차, 일부 키워드",
      premium: "상세 목차, 연관 개념 맵, 심층 키워드",
      premiumDetail: "핵심 설명 제공",
      freeIcon: <MinusCircle className="text-yellow-500 mx-auto" />,
      premiumIcon: <CheckCircle2 className="text-green-500 mx-auto" />,
    },
    {
      feature: "스마트 콘텐츠 변환 - 기타",
      free: "제한적",
      premium: "강의 MP3 변환, OCR 강화, 예상 문제 (향후)",
      premiumDetail: "다양한 학습 방식 지원",
      freeIcon: <XCircle className="text-red-500 mx-auto" />,
      premiumIcon: <CheckCircle2 className="text-green-500 mx-auto" />,
    },
    {
      feature: "학습 확인 & 관리 - AI 퀴즈",
      free: "챕터당 5문제 (객관식)",
      premium: "무제한 AI 퀴즈 (다양한 유형)",
      premiumDetail: "상세 해설, 관련 자료 링크",
      freeIcon: <MinusCircle className="text-yellow-500 mx-auto" />,
      premiumIcon: <CheckCircle2 className="text-green-500 mx-auto" />,
    },
    {
      feature: "학습 확인 & 관리 - 분석/관리",
      free: "기본 오답 확인 (해설 제공)",
      premium: "오답노트 심층 관리, 학습 진도/취약점 분석",
      premiumDetail: "개인화 대시보드, 맞춤 복습 (향후)",
      freeIcon: <CheckCircle2 className="text-green-500 mx-auto" />,
      premiumIcon: <CheckCircle2 className="text-green-500 mx-auto" />,
    },
  ];

  return (
    <Card className="shadow-lg">
      <CardHeader className="bg-slate-50 rounded-t-lg">
        <CardTitle className="text-center text-2xl md:text-3xl font-bold text-slate-800">
          무료 플랜 vs 프리미엄 플랜 비교
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table className="min-w-full">
            <TableHeader className="bg-slate-100">
              <TableRow>
                <TableHead className="w-[30%] p-4 text-left text-base font-bold text-slate-700">주요 기능</TableHead>
                <TableHead className="w-[35%] p-4 text-center text-base font-bold text-slate-700">무료 플랜</TableHead>
                <TableHead className="w-[35%] p-4 text-center text-base font-bold text-purple-700 bg-purple-50">프리미엄 플랜</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {features.map((item, index) => (
                <TableRow key={index} className="border-b last:border-b-0 hover:bg-slate-50 transition-colors">
                  <TableCell className="p-4 font-medium text-slate-700">{item.feature}</TableCell>
                  <TableCell className="p-4 text-center text-slate-600">
                    <div className="flex flex-col items-center">
                      {item.freeIcon && <div className="mb-1">{item.freeIcon}</div>}
                      <span>{item.free}</span>
                    </div>
                  </TableCell>
                  <TableCell className="p-4 text-center bg-purple-50/50">
                    <div className="flex flex-col items-center">
                      {item.premiumIcon && <div className="mb-1">{item.premiumIcon}</div>}
                      <span className="font-semibold text-purple-700">{item.premium}</span>
                      {item.premiumDetail && (
                        <div className="text-sm text-slate-500 mt-1 px-2">
                          {item.premiumDetail}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeatureComparisonTable;