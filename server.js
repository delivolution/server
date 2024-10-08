const {Web3} = require('web3');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const fs = require('fs');
const { mongoose, connectDB } = require('./db');
const express = require('express');
const app = express();
app.use(express.json()); // JSON 파싱을 위한 미들웨어 추가

// MongoDB 연결
connectDB();

// 스마트 컨트랙트 ABI와 주소를 불러옵니다.
const contractABI = JSON.parse(fs.readFileSync('DeliveryOrder.json', 'utf-8'));
const contractAddress = '0x553B174382ceaEb7AB85dC29060A744e1eC8DDc9'; // 스마트 컨트랙트 주소를 입력하세요.
const keys = JSON.parse(fs.readFileSync('key.json', 'utf-8'));

// 이더리움 개인 키와 인포우라 엔드포인트를 사용하여 프로바이더를 설정합니다.
const provider = new HDWalletProvider(
    keys.privateKey,
    `https://polygon-amoy.infura.io/v3/${keys.infuraProjectId}`
  );
const web3 = new Web3(provider);
//const web3 = new Web3(new Web3.providers.HttpProvider(`https://polygon-amoy.infura.io/v3/${keys.infuraProjectId}`));

// 스마트 컨트랙트 인스턴스를 생성합니다.
const contract = new web3.eth.Contract(contractABI.abi, contractAddress);


// 주문이 들어왔을 때 처리하는 엔드포인트
app.post('/order', async (req, res) => {
    try {
      /*
      orderdata{
        deliveryAddress, (배달주소)
        messageToOwner,(사장님 요청사항)
        messageToRider, (라이더 요청사항)
        shopId, (주문하는 가게)
        menu, (주문하는 메뉴)
        deliveryFee1, (기본배달비)
        deliveryFee2, (추가배달비)
        amount, (총 결제금액)
        payment (결제수단)
      } 
      */
      // 주문 정보를 받아옴
      const orderData = req.body;
      const recipientAddress = keys.address; // 주문 정보를 받을 지갑 주소
  
      // 주문 정보를 이용하여 트랜잭션 생성
      /*const tx = contract.methods.createOrder(orderData.messageToOwner, orderData.shopId, orderData.menuId, 
        orderData.amount, orderData.shopId, recipientAddress
      ).encodeABI();*/

      console.log("test2");
      const tx = contract.methods.createOrder(orderData.messageToOwner, orderData.shopId, orderData.menuId, 
        orderData.amount, orderData.deliveryAddress, orderData.messageToRider, orderData.deliveryFee1, orderData.deliveryFee2, orderData.payment, recipientAddress
      ).encodeABI();

      //const orderValue = amount-(deliveryFee1 + deliveryFee2) -> 이더로변환해서 전달 -> deliveryFee빼는 이유는 기사측 금액은 서비스에서 정산
      const orderValue = '0.0001'; // 이더리움 전송 금액을 문자열로 지정 0.0001 = 400KRW정도(2024.5.14기준)
  
      console.log("test3");
      // 생성된 트랜잭션을 Polygon 네트워크로 전송
      const receipt = await sendTransaction(tx, orderValue);
      console.log("test4");
  

      // 배달기사 측 배차 pool에 주문 전달
      const deliveryItem = {
        deliveryAddress: orderData.deliveryAddress,
        messageToRider: orderData.messageToRider,
        shopId: orderData.shopId,
        menu:  orderData.menu,  
        deliveryFee1: orderData.deliveryFee1,
        deliveryFee2: orderData.deliveryFee2,
        amount: orderData.amount,
        payment: orderData.payment,
      };
      const db = mongoose.db('delivolution');
      const collection = db.collection('deliveryPool');
      await collection.insertOne(deliveryItem);
      // 트랜잭션이 성공적으로 전송되면 가게 측으로 응답
      res.status(200).json({ message: 'Transaction sent successfully', txHash: receipt.transactionHash });
    } catch (error) {
      // 오류 발생 시 클라이언트에게 오류 메시지 전송
      res.status(500).json({ error: error.message });
    }
});

// 모든 가게 정보 조회 엔드포인트
app.get('/shops', async (req, res) => {
  try {
    // MongoDB에서 모든 가게 정보 조회
    const db = mongoose.db('delivolution');
    const collection = db.collection('shops');
    const shops = await collection.find({}).toArray();

    // 조회된 모든 가게 정보 응답
    res.status(200).json({ shops });
  } catch (error) {
    // 오류 발생 시 클라이언트에게 오류 메시지 전송
    res.status(500).json({ error: error.message });
  }
});

// 배차 정보 조회 엔드포인트
app.get('/deliveryPool', async (req, res) => {
  try {
    // MongoDB에서 모든 가게 정보 조회
    const db = mongoose.db('delivolution');
    const collection = db.collection('deliveryPool');
    const deliveryPool = await collection.find({}).toArray();

    // 조회된 모든 가게 정보 응답
    res.status(200).json({ deliveryPool });
  } catch (error) {
    // 오류 발생 시 클라이언트에게 오류 메시지 전송
    res.status(500).json({ error: error.message });
  }
});
  
// 트랜잭션을 보내는 함수
const sendTransaction = async (encodedTx, orderValue) => {
  const accounts = await web3.eth.getAccounts();

  console.log('Sending transaction from account:', accounts[0]);

  const result = await web3.eth.sendTransaction({
    from: accounts[0],
    to: contractAddress, // 스마트 컨트랙트 주소
    data: encodedTx, // 인코딩된 트랜잭션 데이터
    value: web3.utils.toWei(orderValue*0.0000001, 'ether'), // 이더리움 전송 금액(orderValue를 이더로 환산해서 넣어야함)
    gas: 1 // 가스, 실제 필요한 양에 따라 조정해야 할 수 있습니다.
  });

  console.log('Transaction successful with hash:', result.transactionHash);
  return result;
};
  
// 예외 처리
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});