const Web3 = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');

// 이더리움 개인 키와 인포우라 엔드포인트를 사용하여 프로바이더를 설정합니다.
const provider = new HDWalletProvider(
  'your-private-key', // 여기에 이더리움 개인 키를 입력하세요.
  'https://polygon-mumbai.infura.io/v3/your-infura-project-id' // 여기에 인포우라 프로젝트 ID를 입력하세요.
);

const web3 = new Web3(provider);

const sendTransaction = async () => {
  const accounts = await web3.eth.getAccounts();

  console.log('Sending transaction from account:', accounts[0]);

  const result = await web3.eth.sendTransaction({
    from: accounts[0],
    to: '0xrecipient', // 여기에 수신자 주소를 입력하세요.
    value: web3.utils.toWei('0.1', 'ether')
  });

  console.log('Transaction successful with hash:', result.transactionHash);
};

sendTransaction().catch(console.error);
