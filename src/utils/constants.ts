export interface PartConfig {
  part: number;
  partTitle: string;
  instructions: string;
  defaultPrepTime: number | ((qIndex: number) => number);
  defaultRespTime: number | ((qIndex: number) => number);
  partTime?: number; // Total part time (primarily for Writing Part 1)
}

export const DEFAULT_SPEAKING_PARTS: Record<number, PartConfig> = {
  1: {
    part: 1,
    partTitle: 'Part 1: Read a Text Aloud',
    instructions: 'In this part of the test, you will read aloud the text on the screen. You will have 45 seconds to prepare. Then you will have 45 seconds to read the text aloud.',
    defaultPrepTime: 45,
    defaultRespTime: 45,
  },
  2: {
    part: 2,
    partTitle: 'Part 2: Describe a Picture',
    instructions: 'In this part of the test, you will describe the picture on your screen in as much detail as you can. You will have 45 seconds to prepare your response. Then you will have 30 seconds to speak about the picture.',
    defaultPrepTime: 45,
    defaultRespTime: 30, // Official TOEIC Speaking Part 2 response time is 30 seconds
  },
  3: {
    part: 3,
    partTitle: 'Part 3: Respond to Questions',
    instructions: 'In this part of the test, you will answer three questions. You will have 3 seconds to prepare after you hear each question. You will have 15 seconds to respond to Questions 5 and 6, and 30 seconds to respond to Question 7.',
    defaultPrepTime: 3,
    defaultRespTime: (qIndex: number) => (qIndex === 2 ? 30 : 15), // Q5 & Q6 are index 0,1 (15s), Q7 is index 2 (30s)
  },
  4: {
    part: 4,
    partTitle: 'Part 4: Respond to Questions Using Information Provided',
    instructions: 'In this part of the test, you will answer three questions based on the information provided. You will have 45 seconds to read the information before the questions begin. You will have 3 seconds to prepare after you hear each question. You will have 15 seconds to respond to Questions 8 and 9, and 30 seconds to respond to Question 10.',
    defaultPrepTime: 3,
    defaultRespTime: (qIndex: number) => (qIndex === 2 ? 30 : 15), // Q8 & Q9 (15s), Q10 (30s)
  },
  5: {
    part: 5,
    partTitle: 'Part 5: Express an Opinion',
    instructions: 'In this part of the test, you will give your opinion about a specific topic. Be sure to say as much as you can in the time allowed. You will have 45 seconds to prepare. Then you will have 60 seconds to speak.',
    defaultPrepTime: 45,
    defaultRespTime: 60,
  },
};

export const DEFAULT_WRITING_PARTS: Record<number, PartConfig> = {
  1: {
    part: 1,
    partTitle: 'Part 1: Write a Sentence Based on a Picture',
    instructions: 'In this part of the test, you will write ONE sentence that is based on a picture. With each picture, you will be given TWO words or phrases that you must use in your sentence. You can change the forms of the words and you can use the words in any order. You will have 8 minutes to complete this part of the test.',
    defaultPrepTime: 0,
    defaultRespTime: 0,
    partTime: 480, // 8 minutes total
  },
  2: {
    part: 2,
    partTitle: 'Part 2: Respond to a Written Request',
    instructions: 'In this part of the test, you will show how well you can write a response to an e-mail. Your response will be scored on the quality and variety of your sentences, vocabulary, and organization. You will have 10 minutes to read and answer each e-mail.',
    defaultPrepTime: 0,
    defaultRespTime: 600, // 10 minutes per question (email)
  },
  3: {
    part: 3,
    partTitle: 'Part 3: Write an Opinion Essay',
    instructions: 'In this part of the test, you will write an essay in response to a question that asks you to state, explain, and support your opinion on an issue. Typically, an effective essay will contain a minimum of 300 words. You will have 30 minutes to plan, write, and revise your essay.',
    defaultPrepTime: 0,
    defaultRespTime: 1800, // 30 minutes
  },
};

export function getSpeakingPartConfig(partNum: number): PartConfig | undefined {
  return DEFAULT_SPEAKING_PARTS[partNum];
}

export function getWritingPartConfig(partNum: number): PartConfig | undefined {
  return DEFAULT_WRITING_PARTS[partNum];
}
