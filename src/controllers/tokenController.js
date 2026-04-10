const  axios = require('axios');

let apiToken;
const generateToken = async () => {
        let agentCode = process.env.AGENT_TOKEN;
        let agentSecret = process.env.AGENT_SECRET;
        let token = Buffer.from(`${agentCode}:${agentSecret}`).toString('base64');
        console.log("token ",token);
        const url = `https://gator.drakon.casino/api/v1/auth/authentication`;
        try {
          const response = await axios.post(url,null, {
            headers: {
              'Authorization': `Bearer . ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if(response.status = 200 && response.data.access_token){
            apiToken = response.data.access_token;
            console.log("apitoken ",apiToken);
          }
        //   console.log('Response:', response);

        } catch (error) {
          console.error('Error making POST request:', error);
        }
}

const getToken = () => {
    return apiToken;
}

module.exports= {getToken,generateToken};