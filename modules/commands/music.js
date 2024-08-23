const fs = require('fs');
const path = require('path');
const axios = require('axios');
const yts = require('yt-search');

module.exports.config = {
  name: "music",
  hasPermission: 0,
  version: "1.0.0",
  description: "Get music",
  usePrefix: true,
  credits: "Jonell Magallanes",
  cooldowns: 10,
  commandCategory: "Utility"
};

module.exports.run = async function ({ api, event, args }) {
  if (!args[0]) {
    return api.sendMessage(`❌ Please enter a music name!`, event.threadID);
  }

  try {
    const song = args.join(" ");
    const findingMessage = await api.sendMessage(`🔍 | Finding "${song}". Please wait...`, event.threadID);

    const searchResults = await yts(song);
    const firstResult = searchResults.videos[0];

    if (!firstResult) {
      await api.sendMessage(`❌ | No results found for "${song}".`, event.threadID);
      return;
    }

    const { title, url } = firstResult;

    await api.editMessage(`⏱️ | Music info found: "${title}". Downloading...`, findingMessage.messageID);

    const apiUrl = `http://de01.uniplex.xyz:5611/yt?url=${url}&version=v3`;
    const response = await axios.get(apiUrl);
    const { audio } = response.data;

    if (!audio) {
      await api.sendMessage(`❌ | No audio found for "${song}".`, event.threadID);
      return;
    }

    const responseStream = await axios.get(audio, {
      responseType: 'stream',
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    const filePath = path.resolve(__dirname, 'temp', `${Date.now()}-${title}.mp3`);
    const fileStream = fs.createWriteStream(filePath);

    responseStream.data.pipe(fileStream);

    fileStream.on('finish', async () => {
      const stats = fs.statSync(filePath);
      const fileSizeInMB = stats.size / (1024 * 1024);

      if (fileSizeInMB > 25) {
        await api.sendMessage(`❌ | The file size exceeds 25MB limit. Unable to send "${title}".`, event.threadID);
        fs.unlinkSync(filePath);
        return;
      }

      const respoawait = await axios.get(`https://jonellccprojectapis10.adaptable.app/api/tinyurl?url=${audio}`);
      const short = respoawait.data.shortenedUrl;
      
      await api.sendMessage({
        body: `🎵 | Here is your music: "${title}"\n\nTitle: ${title}\nYoutube Link: ${url}\nDownload Link: ${short}`,
        attachment: fs.createReadStream(filePath)
      }, event.threadID);

      fs.unlinkSync(filePath);
      api.unsendMessage(findingMessage.messageID);
    });

    responseStream.data.on('error', async (error) => {
      console.error(error);
      await api.sendMessage(`❌ | Sorry, there was an error downloading the music: ${error.message}`, event.threadID);
      fs.unlinkSync(filePath);
    });
  } catch (error) {
    console.error(error);
    await api.sendMessage(`❌ | Sorry, there was an error getting the music: ${error.message}`, event.threadID);
  }
};