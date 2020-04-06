import React, { useState, useEffect } from 'react';

import { Line } from '@antv/g2plot';
import './App.css';
import 'antd/dist/antd.css';
import { AutoComplete, List, Typography, Checkbox, InputNumber, Row, Col, Spin  } from 'antd';
const axios = require('axios');

let linePlot; 
// 模拟总金额
const TOTAL_INIT_MONEY = 100000;
const START_TIME = '20190404';
const END_TIME = '20200404';

// API字段说明
// "TIME" : "20180808",                 #交易日时间
// "CLOSE" : "88.88",                   #收盘价
// "HIGH" : "88.88",                    #最高价
// "LOW" : "88.88",                     #最低价
// "OPEN" : "88.88",                    #开盘价
// "PRE_CLOSE" : "88.88",               #昨日收盘价
// "MARKET_CAPITAL" : "1016722868",     #流通市值
// "TOTAL_CAPITAL" : "1016722868",      #总市值
// "VOLUME" : "69207082",               #成交量
// "TURNOVER" : "1016722868",           #成交额
// "TURNOVER_RATE" : "-2.49%",          #换手率
// "UPDOWN" : "-0.36",                  #涨跌额
// "UPDOWN_PER" : "-2.49%"              #涨跌幅


function App() {
    

  const [loading,setLoading] = useState(false);
  const [fundList] = useState([]);

  useEffect(() => {
     console.log('首次情况，进行绘制!');
     linePlot = new Line('invesment-canvas', {
        data: [],
        xField: 'TIME',
        yField: 'ACTURAL_MONEY',
      })
     linePlot.render();
     return ()=>{
      console.log('componentWillUnmount')
     }
  },[]); 
  // 刷新图
  const refreshPlot = (plotList) =>{
    console.log('重绘!');
    linePlot.changeData(plotList);
  };
  // 返回搜索下需要的对象
  const mockVal = (str: string, repeat: number = 1) => {
    return {
      value: str.repeat(repeat),
    };
  };
  const [options, setOptions] = useState([]);
  // 搜索
  const onSearch = (searchText: string) => {
    setOptions(
      !searchText ? [] : [mockVal(searchText)],
    );
  };
  // 搜索结果选中
  const onSelect = (stockCode: string) => {
    console.log('选中查询代码：', stockCode);
    setLoading(true);
    axios.get(
        `http://istock.market.alicloudapi.com/ai_fintech_knowledge/ai_stock_trade_market?END_TIME=${END_TIME}&START_TIME=${START_TIME}&STOCK_CODE=` + stockCode,
        { headers: {'Authorization': 'APPCODE 49283aa874b44267af0880ca7f458abe'}}).then(res => {
      // console.log(res);
      setLoading(false);
      // fundItem : 每个票的数据 + 权重 + 是否选中
      let fundItem = Object.assign({checked:false, weight:0},res.data);
      // 增加
      setZixuanList(zixuanList.concat(fundItem));
    });
  };
  // 股票池选中
  const onCheckboxChange = (checkStatusObj,data) => {
    // console.log(checkStatusObj.target.checked,data);
    let changeCode = data.STOCK_CODE;
    let zixuanListAfterWeight = zixuanList.map( zixuanItem => {
      // 改变权重的自选股 weight随之变化
      if ( changeCode === zixuanItem.STOCK_CODE ) {
        zixuanItem.checked = checkStatusObj.target.checked;
      } 
      return zixuanItem;
    });
    setZixuanList(zixuanListAfterWeight);

  };
  // 权重变化
  const numberChange = (value,data) => {
    // console.log(value,data);
    let changeCode = data.STOCK_CODE;
    let zixuanListAfterWeight = zixuanList.map( zixuanItem => {
      // 改变权重的自选股 weight随之变化
      if ( changeCode === zixuanItem.STOCK_CODE ) {
        zixuanItem.weight = value;
      } 
      return zixuanItem;
    });
    setZixuanList(zixuanListAfterWeight);
  };

  // 自选列表 数据变化的时候
  const [zixuanList, setZixuanList] = useState([]);
  useEffect(() => {
    console.log('自选列表数据变动Effect:' , zixuanList);
    // 计算最终曲线
    let line = calculateCheckListWidthWeightToFinalMoney(zixuanList);
    console.log('line',line)
    // 折线图渲染
    refreshPlot(line);
  },[zixuanList]);
 
 // 根据自选列表 选择状态和权重 ，计算最终金额
 const calculateCheckListWidthWeightToFinalMoney = (zList) => {
    // console.log(zList);
    // copy一个时间 维度基本数据结构 (以第一条数据为标准)
    let timeValueBase = [];
    if (zList.length > 0) {
      timeValueBase = zList[0].STOCK_TRADE_ENTITY.map(item => {
        return {TIME:item.TIME, UP_DOWN_VALUE:0, ACTURAL_MONEY:0}
      });
      console.log('timeValueBase:',timeValueBase);
    }
    // 自选列表 中选中的数据，算出单日涨跌幅
    zList.forEach( zItem => {
      if(zItem.checked) {
        console.log(zItem.STOCK_TRADE_ENTITY);
        zItem.STOCK_TRADE_ENTITY.forEach( sItem => {
          timeValueBase = addValueOfATime(sItem.TIME,zItem.weight * parseFloat( (sItem.CLOSE - sItem.PRE_CLOSE) / sItem.PRE_CLOSE ) );
        })
      }
    });
    // 复利计算出最终钱的波动
    timeValueBase.forEach( (amItem,amIndex) => {
      let yesterdayMoney = (amIndex === 0? TOTAL_INIT_MONEY : timeValueBase[amIndex - 1].ACTURAL_MONEY);
      // console.log(amIndex,amItem);
      // 第一个用初始资金，后面用复利计算
      amItem.ACTURAL_MONEY = yesterdayMoney + amItem.UP_DOWN_VALUE * yesterdayMoney;
    })
    // console.log(timeValueBase )

    // 给最终结果在 time 那一天 加上 value值
    function addValueOfATime(time, value){
      let newTimeValueBase = timeValueBase.map( tItem => {
        if (tItem.TIME === time) {
          tItem.UP_DOWN_VALUE += value; 
          return tItem;
        }
        return tItem;
      })
      return newTimeValueBase;
    }
    return timeValueBase;
 }
 



    
  return (
     <Spin tip="Loading..." spinning={loading}>
   
 
    <div className="App">
      <AutoComplete
        options={options}
        style={{ width: 200 }}
        onSelect={onSelect}
        onSearch={onSearch}
        placeholder="请输入代码或名称"
      />
      <div className="stock-container">
        <List
          header={<div>自选池</div>}
          bordered
          dataSource={zixuanList}
          renderItem={item => (
            <List.Item>
                <Row style={{ width: 400 }}>
                  <Col span={3}>
                    <Checkbox  onChange={(checekValue)=> onCheckboxChange(checekValue,item)}></Checkbox>
                  </Col>
                  <Col span={17}> {item.STOCK_CODE} </Col>
                  <Col span={4}>
                    <InputNumber defaultValue={0} min={0} max={10} step={0.1} onChange={(value)=>numberChange(value,item)} />
                  </Col>
                </Row>
                
            </List.Item>
          )}
        />
      </div>
      <div id="invesment-canvas"></div>
    </div>
     </Spin>
  );
}

export default App;
