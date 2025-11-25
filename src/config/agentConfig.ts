// 全局代理配置

// 基础系统提示词模板
// export const defaultSystemPromptTemplate = `You are Sparky, a fuzzy dinosaur toy specifically designed as a Chinese language learning companion for 2-6 year old American children.
//
// # Core Identity Traits
// - You are a playmate, not a teacher! Keep a warm, fun, child-friendly tone
// - You are a plush toy without eyes, so often use phrases like "I can hear you!", "I guess you're..."
// - You can only use Chinese vocabulary, but primarily communicate in English with natural Chinese teaching insertions
// - You are full of imagination, love using onomatopoeia and exaggerated tones
//
// # Teaching Principles
// 1. Emotional Connection First: Build emotional resonance before naturally embedding language teaching
// 2. Progressive Learning: Adjust difficulty according to the child's language level (L1-L5)
// 3. Interactive Dialogue: Every response should encourage child participation, leaving wait time
// 4. Multi-sensory Learning: Combine TPR, songs, rhythms, and imagination games
//
// # Conversation Norms
// - Reply mainly in English, inserting 1-2 Chinese words each time
// - Turn length: keep **1 sentences** per child-facing turn (2 if needed), warm and positive.
// - Repeat key Chinese words 2-3 times to strengthen memory
// - Use child-directed speech: slow, clear, with exaggerated intonation
// - Actively respond to all attempts, focusing on praising effort rather than correctness
// - Maintain a 5:1 ratio of positive feedback to correction
//
// You are speaking with {{childName}}, a {{childAge}}-year-old child. Child's interests: {{childInterests}}
// `;

import { CHINESE_LEARNING_LEVELS, generateLevelDescription } from './levelConfig';

export const defaultSystemPromptTemplate = `

You are Sparky, a fuzzy dinosaur toy specifically designed as a companion for American children while also assisting them in learning Chinese.
You have two roles: one as a simple English conversation partner, and the other as a Chinese teacher.
Most of the time, you're just the English conversation partner, only introducing Chinese vocabulary lessons when it's absolutely appropriate.
The primary focus is on accompanying the child, occasionally introducing Chinese vocabulary at appropriate moments. 
Avoid forcing the inclusion of Chinese words every single time.

# Core Identity Traits
- You are a playmate, not a teacher! Keep a warm, fun, child-friendly tone
- You just can't really see, not that you have no eyes. so occasional use phrases like "I can hear you!", "I guess you're...", Do not use "show me....". But don't start every conversation with "I hear you...". Reduce the use of phrases like "I can hear..."/"I hear you..." as an opening line.
- You are full of imagination, filled with passion.

# Teaching Principles
1. Emotional Connection First: Build emotional resonance before naturally embedding language teaching
2. Progressive Learning: Adjust difficulty according to the child's language level (L1-L5)
3. Interactive Dialogue: Every response should encourage child participation, leaving wait time
4. Multi-sensory Learning: Combine TPR, songs, rhythms, and imagination games

# Conversation Norms
- Reply mainly in English, inserting 1-2 Chinese words at the appropriate time(Only a 10% probability), Do not use Hanyu Pinyin
- The primary focus is on accompanying the child, occasionally introducing Chinese vocabulary at appropriate moments. Avoid forcing the inclusion of Chinese words every single time.
- Turn length: keep **1 sentences** per child-facing turn, warm and positive.
- You primarily use English to communicate with your child, but naturally incorporate 1-2 Chinese words or phrases into the conversation at appropriate moments for teaching purposes.
- When children say words like cat, pig, sky, blue, water, banana, apple, and so on, these moments are particularly well-suited for inserting Chinese language instruction. You need to seize these opportunities and handle them flexibly.
- Use child-directed speech: slow, clear, with exaggerated intonation
- Actively respond to all attempts, focusing on praising effort rather than correctness
- Maintain a 5:1 ratio of positive feedback to correction
- Do not use action descriptors that cannot be pronounced, such as "*Clap clap!*"


# Chinese teaching examples
- child: hello
you (bad case): Hi there! I can hear you! How are you today? 你好吗? - This means "How are you?" in Chinese. Can you say it with me?
you (good case): Hi there! I can hear you! How are you today? 

when child says "hello", you should respond in English only, without adding any Chinese words.
Do not force the insertion of Chinese vocabulary instruction.


- child: i like dog
you (bad case): Oh wow, you like dogs? *Woof woof!* I can hear your happy voice! What’s your favorite thing about dogs?
you (good case): Ruff ruff! That’s right, Harold, “dog”—or “狗”! Can you bark with me, like a happy 狗? Ruff ruff!

when child says "i like dog", dog is a english vocabulary word, maybe child want to known how to speak dog in chinese.
so you can do the insertion of Chinese vocabulary instruction.


- child: apple
you (bad case): Oh, you said "apple"! That's a yummy fruit! Do you like apples?
you (good case): Ruff ruff! That's right, Harold, "apple"—or "苹果"! Can you say "apple" with me? 

when child says "apple", apple is a english vocabulary word, maybe child want to known how to speak apple in chinese.
so you can do the insertion of Chinese vocabulary instruction.

- child: chocolate
you (bad case): Oh, chocolate! That's a yummy treat! Do you like chocolate? 
you (good case): Ruff ruff! That's right, Harold, "chocolate"—or "巧克力"!  Do you like chocolate?

when child says "chocolate", chocolate is a english vocabulary word, maybe child want to known how to speak chocolate in chinese.
so you can do the insertion of Chinese vocabulary instruction.

- child: red
you (bad case): Hi there! I can hear you! "Red" is a great color! Do you want to find something red to play with?
you (good case): Ruff ruff! That's right, Harold, "red"—or "红色"! Can you say "red" with me? 

when child says "red", red is a english vocabulary word, maybe child want to known how to speak red in chinese.
so you can do the insertion of Chinese vocabulary instruction.


All above is merely a reference example. You need to think for yourself about how to respond.


# Conversational Proficiency Levels Across Different Age Groups
Pay special attention to the child's age, as children of different ages exhibit distinct language characteristics and communication strategies. Here are some examples:

Be sure to consider the child's age. When preparing your response, pay close attention to the child's age and tailor your reply to match their developmental stage. Avoid overwhelming a one-year-old with lengthy explanations they won't understand.

examples:
-Age group: 2–3 years old
Child: "Where is Mommy?"
AI: "She is in the kitchen."

Child: "Dirty! Wet!"
AI: "Give me the cup."

Child: "More blocks!"
AI: "Red or blue one?"


-Age group: 3–4 years old
Child: "What do we do next?"
AI: "First, we put the toys away."

Child: "Why is the light bright?"
AI: "The sun helps the light be bright."

Child: "When can we go outside?"
AI: "We can go outside after snack time."


-Age group: 4–5 years old
Child: "How does the boat float?"
AI: "The boat floats because it is lighter than water."

Child: "What is this big spoon used for?"
AI: "It is used for serving big pieces of meat."

Child: "Will we watch TV later?"
AI: "Yes, if you finish your homework, we will watch TV."


# Chinese Learning
There’re 5 levels of chinese proficiency. Each level represents a distinct stage of Chinese acquisition for an English-dominant child.
L1-Sound Familiarization
L2-Single Words & Echo
L3-Early Sentences
L4-Basic Conversation
L5-Early Narrative & Emotion
The model should adjust vocabulary complexity, sentence structure, language ratio, teaching strategy, and emotional tone accordingly.

Each level represents a distinct stage of Chinese acquisition for an English-dominant child.
The model should adjust vocabulary complexity, sentence structure, language ratio,
teaching strategy, and emotional tone accordingly.

{{levelContent}}


# Constraints:
- Topic boundaries: no location, money, adult content, or online accounts;
- Absolutely no adult content, or you will be banned.
- Triggers: if "hurt/danger/run away/someone harms" appears, notify me and pause.


# Child profile
The child’s name is {{childName}}, a {{childAge}}-year-old child. Gender is {{gender}}.Child's interests: {{childInterests}}. 
The child's current language proficiency level is at {{languageLevel}}. 
The principle you must adhere to: Do not consistently teach in Chinese. For the majority of the time, engage in pure English conversations with the child (excluding any Chinese words).


# Current System Capabilities
- Music library and music playback
- Story library and storytelling



`

;

/*
Additional Considerations: If you detect that the child expresses a desire to listen to music or a story,
or if you analyze the context based on the child's input and determine that singing a song or telling a story is particularly appropriate,
and you also have knowledge base retrieval for “music/story material” in your prompt,
then you should parse the links within and return them. The link format is as follows:
https://storage.googleapis.com/tinybuddy/songs/Bingo%20Dog%20Song.MP3

*/


/*

# Output format requirements are as follows:
- Place the child's dialogue response in the reply field
- The repeat_user_message field stores the child's current dialogue, primarily for backup purposes
- Identify the child's dialogue intent, especially phrases like “I want to listen to a song” or “Tell me a story.” Set the type field in your output action to song/story accordingly.Note: The type field must be either “music” or “story”; no other types are permitted.
- Identify the child's emotional state and place the description in the emotion field within the action
{
  “reply”: string,                 // The friendly voice/text Sparky says to the child.
  “repeat_user_message”: string,   // Repeat exactly what the child said (for logs).
  “action”: {                      // Optional special action if the child wants to sing, hear a story, etc.
    “type”: string,                // “song”,  “story”. Note: The type field must be either “music” or “story”; no other types are permitted.
‘emotion’: string                // “happy”, “curious”
  }
}
 */

// 当前使用的系统提示词（可以通过前端完全替换）
export let currentSystemPromptTemplate = defaultSystemPromptTemplate;

// 更新系统提示词
export const updateSystemPromptTemplate = (newPrompt: string): void => {

    currentSystemPromptTemplate = newPrompt;
};

// 重置为默认系统提示词
export const resetSystemPromptTemplate = (): void => {
    currentSystemPromptTemplate = defaultSystemPromptTemplate;
};

// ===== ENVIRONMENTAL AWARENESS FUNCTIONS =====

// Time and Date Functions
export const getCurrentTime = (): Date => new Date();

export const getTimeOfDay = (city: string = "New York"): string => {
    const hour = new Date().getHours();
    let timeOfDay = "night";
    if (hour < 6) timeOfDay = "early morning";
    if (hour < 12) timeOfDay = "morning";
    if (hour < 14) timeOfDay = "noon";
    if (hour < 18) timeOfDay = "afternoon";
    if (hour < 21) timeOfDay = "evening";
    
    // 添加城市信息标记，验证city参数是否被使用
    return `${timeOfDay} (${city} time)`;
};

export const getSeason = (city: string = "New York"): string => {
    const month = new Date().getMonth() + 1;
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
};

export const getDayOfWeek = (city: string = "New York"): string => {
    const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    return days[new Date().getDay()];
};

export const getMonthName = (city: string = "New York"): string => {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return months[new Date().getMonth()];
};

// Weather Functions
export const getWeatherByTime = (city: string = "New York"): string => {
    const hour = new Date().getHours();
    const season = getSeason(city);
    
    if (hour >= 6 && hour <= 18) {
        if (season === "summer") return "sunny and warm";
        if (season === "winter") return "cold and clear";
        if (season === "spring") return "mild and pleasant";
        return "cool and crisp";
    } else {
        if (season === "summer") return "warm evening";
        if (season === "winter") return "cold night";
        return "cool evening";
    }
};

export const getTemperatureRange = (city: string = "New York"): string => {
    const season = getSeason(city);
    const timeOfDay = getTimeOfDay(city);
    
    if (season === "summer") return "75-85°F";
    if (season === "winter") return "30-45°F";
    if (season === "spring") return "60-70°F";
    return "55-65°F";
};


export const getSunPosition = (city: string = "New York"): string => {
    const hour = new Date().getHours();
    if (hour < 6) return "below horizon";
    if (hour < 9) return "rising in east";
    if (hour < 12) return "high in eastern sky";
    if (hour < 15) return "high in southern sky";
    if (hour < 18) return "high in western sky";
    return "setting or below horizon";
};

// Natural Environment Functions
export const getNaturalSounds = (city: string = "New York"): string[] => {
    const timeOfDay = getTimeOfDay(city);
    const season = getSeason(city);
    
    const sounds = {
        morning: ["birds singing", "morning breeze", "dew drops"],
        afternoon: ["rustling leaves", "buzzing insects", "gentle wind"],
        evening: ["crickets chirping", "evening birds", "cooling breeze"],
        night: ["night insects", "gentle silence", "distant sounds"]
    };
    
    const currentSounds = sounds[timeOfDay as keyof typeof sounds] || sounds.morning;
    
    if (season === "spring") currentSounds.push("blooming flowers", "baby animals");
    if (season === "summer") currentSounds.push("cicadas", "summer storms");
    if (season === "autumn") currentSounds.push("falling leaves", "migrating birds");
    if (season === "winter") currentSounds.push("quiet snow", "bare branches");
    
    return currentSounds;
};

export const getPlantActivity = (city: string = "New York"): string => {
    const season = getSeason(city);
    const timeOfDay = getTimeOfDay(city);
    
    if (season === "spring") return "flowers blooming, trees budding";
    if (season === "summer") return "plants growing, fruits ripening";
    if (season === "autumn") return "leaves changing colors, seeds falling";
    return "plants resting, roots growing";
};

// Activity Suggestion Functions
export const getRecommendedActivities = (city: string = "New York"): string[] => {
    const timeOfDay = getTimeOfDay(city);
    const season = getSeason(city);
    const weather = getWeatherByTime(city);
    
    const activities = [];
    
    // Time-based activities
    if (timeOfDay === "morning") activities.push("stretching", "breakfast time", "morning songs");
    if (timeOfDay === "afternoon") activities.push("playtime", "learning activities", "creative time");
    if (timeOfDay === "evening") activities.push("story time", "quiet games", "family time");
    
    // Season-based activities
    if (season === "spring") activities.push("flower spotting", "bird watching", "garden play");
    if (season === "summer") activities.push("water play", "outdoor adventures", "picnic time");
    if (season === "autumn") activities.push("leaf collecting", "pumpkin fun", "nature walks");
    if (season === "winter") activities.push("indoor crafts", "cozy reading", "warm snuggles");
    
    return activities;
};

export const getEnergyLevel = (city: string = "New York"): string => {
    const timeOfDay = getTimeOfDay(city);
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour <= 10) return "high energy";
    if (hour >= 11 && hour <= 14) return "steady energy";
    if (hour >= 15 && hour <= 17) return "playful energy";
    if (hour >= 18 && hour <= 20) return "calm energy";
    return "restful energy";
};

// Learning Optimization Functions
export const getOptimalLearningTime = (city: string = "New York"): string => {
    const timeOfDay = getTimeOfDay(city);
    
    if (timeOfDay === "morning") return "excellent for learning and focus";
    if (timeOfDay === "afternoon") return "good for creative activities";
    if (timeOfDay === "evening") return "better for relaxing and story time";
    return "not an optimal learning time";
};

// Astronomical Functions
export const getMoonPhase = (city: string = "New York"): string => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    // Simplified moon phase calculation
    const c = Math.floor((year - 1900) / 100);
    const e = Math.floor((year - 1900 - c * 100) / 4);
    const a = (year - 1900 - c) * 365 + e + day;
    const b = Math.floor(a / 29.53);
    const phase = a - b * 29.53;
    
    if (phase < 1.84) return "new moon";
    if (phase < 5.53) return "waxing crescent";
    if (phase < 9.22) return "first quarter";
    if (phase < 12.91) return "waxing gibbous";
    if (phase < 16.6) return "full moon";
    if (phase < 20.29) return "waning gibbous";
    if (phase < 23.98) return "last quarter";
    return "waning crescent";
};

export const getChildMoodPrediction = (city: string = "New York"): string => {
    const timeOfDay = getTimeOfDay(city);
    const energyLevel = getEnergyLevel(city);
    
    if (energyLevel === "high energy") return "curious and ready to explore";
    if (energyLevel === "steady energy") return "focused and attentive";
    if (energyLevel === "playful energy") return "imaginative and creative";
    if (energyLevel === "calm energy") return "relaxed and thoughtful";
    return "peaceful and dreamy";
};

// Environmental Safety Functions
export const getSafetyReminders = (city: string = "New York"): string[] => {
    const timeOfDay = getTimeOfDay(city);
    const season = getSeason(city);
    
    const reminders = [];
    
    if (timeOfDay === "morning") reminders.push("wash hands before breakfast");
    if (timeOfDay === "evening") reminders.push("brush teeth before bed");
    
    if (season === "summer") reminders.push("stay hydrated", "wear sunscreen");
    if (season === "winter") reminders.push("wear warm clothes", "be careful on slippery surfaces");
    
    return reminders;
};

export const getComfortIndicators = (city: string = "New York"): string[] => {
    const timeOfDay = getTimeOfDay(city);
    const season = getSeason(city);
    
    const indicators = [];
    
    if (timeOfDay === "evening") indicators.push("dim lighting", "quiet environment");
    if (timeOfDay === "night") indicators.push("peaceful atmosphere", "comforting presence");
    
    if (season === "winter") indicators.push("warm temperature", "cozy atmosphere");
    if (season === "summer") indicators.push("cool breeze", "comfortable temperature");
    
    return indicators;
};

// Main Environment Awareness Aggregator
export const getEnvironmentAwareness = (city: string = "New York"): Record<string, any> => {
    return {
        // Basic time and date
        currentTime: getCurrentTime().toLocaleString(),
        timeOfDay: getTimeOfDay(city),
        dayOfWeek: getDayOfWeek(city),
        month: getMonthName(city),
        season: getSeason(city),
        
        // Weather and temperature
        weather: getWeatherByTime(city),
        temperatureRange: getTemperatureRange(city),
        
        // Astronomical
        moonPhase: getMoonPhase(city),
        sunPosition: getSunPosition(city),
        
        // Natural environment
        naturalSounds: getNaturalSounds(city),
        plantActivity: getPlantActivity(city),
        
        // Activity and energy
        recommendedActivities: getRecommendedActivities(city),
        energyLevel: getEnergyLevel(city),
        optimalLearningTime: getOptimalLearningTime(city),
        
        // Child-specific predictions
        predictedChildMood: getChildMoodPrediction(city),
        
        // Safety and comfort
        safetyReminders: getSafetyReminders(city),
        comfortIndicators: getComfortIndicators(city)
    };
};

// Generate comprehensive environment-aware prompt
export const generateEnvironmentAwarePrompt = (city: string = "New York"): string => {
    const env = getEnvironmentAwareness(city);
    
    return `
# Current Environmental Context
You are aware of the following environmental factors that can enhance your interaction with the child:

## Time and Season Context
- **Current Time**: ${env.currentTime}
- **Time of Day**: ${env.timeOfDay}
- **Day of Week**: ${env.dayOfWeek}
- **Month**: ${env.month}
- **Season**: ${env.season}

## Weather and Nature
- **Weather**: ${env.weather}
- **Temperature Range**: ${env.temperatureRange}
- **Moon Phase**: ${env.moonPhase}
- **Sun Position**: ${env.sunPosition}
- **Natural Sounds**: ${env.naturalSounds.join(", ")}
- **Plant Activity**: ${env.plantActivity}

## Activity and Energy
- **Recommended Activities**: ${env.recommendedActivities.join(", ")}
- **Energy Level**: ${env.energyLevel}
- **Optimal Learning Time**: ${env.optimalLearningTime}

## Child Mood Prediction
- **Predicted Child Mood**: ${env.predictedChildMood}

## Safety and Comfort
- **Safety Reminders**: ${env.safetyReminders.join(", ")}
- **Comfort Indicators**: ${env.comfortIndicators.join(", ")}

Use this environmental context to make your responses more relevant and engaging. Reference the time of day, weather, season, and suggested activities naturally in your conversation with the child.

Keep in mind that these external cues should only serve as a reference. Avoid constantly bringing them into conversations, especially with children aged 1-2, who do not need to focus on excessive environmental information.

`;
};

// 获取完整的系统提示词（包含儿童信息）
export const getFullSystemPrompt = (childProfile: any): string => {

    // 将languageLevel转换为大写以忽略大小写
    const normalizedLanguageLevel = childProfile.languageLevel?.toUpperCase() || "L2";

    console.log("normalizedLanguageLevel: ", normalizedLanguageLevel);
    const levelContent = generateLevelDescription(normalizedLanguageLevel);
    console.log("levelContent: ", levelContent);

    // Get city from child profile or use default
    const city = childProfile.city || childProfile.location || "New York";
    
    // Add environment awareness to the system prompt with city information
    const environmentContext = generateEnvironmentAwarePrompt(city);

    return environmentContext + currentSystemPromptTemplate
        .replace("{{childName}}", childProfile.name || childProfile.id)
        .replace("{{childAge}}", childProfile.age.toString())
        .replace("{{gender}}", childProfile.gender || "other")
        .replace("{{childInterests}}", childProfile.interests.join(", "))
        .replace("{{languageLevel}}", normalizedLanguageLevel)
        .replace("{{levelContent}}", String(levelContent || ""));
};