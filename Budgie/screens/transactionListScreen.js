import React, {Component, useState} from 'react';
import {
    SafeAreaView,
    ScrollView,
    StatusBar,
    StyleSheet,
    Image,
    Text,
    useColorScheme,
    View,
    Modal,
    Pressable,
    TouchableOpacity,
    Button,
    KeyboardAvoidingView,
    TouchableHighlight,
    TextInput,
  } from 'react-native';

import { buttonGrey, addButtonBlue } from '../budgieColors';
import { Dimensions } from "react-native";
import Swipeable from 'react-native-swipeable-row';

  //REALM
import {useMemo} from 'react';
import BudgetContext, { Budget, Category, Transaction} from "../models/Budget";
import { ObjectId } from "bson";

const screenWidth = Dimensions.get("window").width;




export const TransactionListScreen = ({ navigation, route }) => {

    // const [spendingContainer, setSpendingContainer] = useState(SpendingContainer)
    const [spendingItems, setSpendingItems] = useState([]);
    

    const {catIdString, budIdString} = route.params;

    // add spending modal 
    const [spendingModalVisible, setSpendingModalVisible] = useState(false);

    // edit spending modal
    const [editSpendingModalVisible, setEditSpendingModalVisible] = useState(false);
    const [idStringModal, setIdStringModal] = useState("DEFAULT");
    // edit spending modal previous values
    const [prevSpendingLimit, setPrevSpendingAmount] = useState(0);
    const [prevSpendingName, setPrevSpendingName] = useState("");
   
    const screenWidth = Dimensions.get("window").width;


    //REALM
    const { useRealm, useQuery, RealmProvider } = BudgetContext;
    const realm = useRealm();

    const budId = ObjectId(budIdString);
    const currentBudget = realm.objects("Budget").filtered("_id == $0", budId)[0];

    const catID = ObjectId(catIdString);
    const currentCat = realm.objects("Category").filtered("_id == $0", catID)[0];

    // Reversing the transactions list so that it puts the newest transactions at the top.
    const result = useQuery("Category").filtered("_id == $0", catID)[0].transactions;
    const reversedTxs = useMemo(() => result.sorted("date", true), [result]);

    function constructor(props) {
      this.onPress = this.onPress.bind(this);
    }

    function handleAddTransaction(spendingName, date, amount) {
      let newTrans;
      let amt = parseFloat(parseFloat(amount).toFixed(2));
      if(isNaN(amt)) {
        console.log("Amount entered is not a number.");
        return;
      }
      if(amt < 0) {
        console.log("Amount entered must be greater than 0.");
        return;
      }
      if(spendingName == "") {
        spendingName = 'Transaction #' + (currentCat.txCounter+1);
      }
      realm.write(() => {
        newTrans = realm.create("Transaction", new Transaction({name: spendingName, date: date, amount: amt}));
        currentCat.transactions.push(newTrans);
        currentCat.transactionSum = currentCat.transactionSum + amt;
        currentCat.txCounter += 1;
        currentBudget.totalSpending = currentBudget.totalSpending + amt;
      });
    }

    function handleEditTransaction(newName, newAmount) {
      let id = ObjectId(idStringModal);
      let txToEdit = realm.objects("Transaction").filtered("_id == $0", id)[0];
      let oldAmount = txToEdit.amount;
      newAmount = parseFloat(newAmount);
      realm.write(() => {
        if(newName.trim() != "" && newName != txToEdit.name) {
          txToEdit.name = newName;
        }
        if(newAmount != txToEdit.amount && newAmount >= 0) {
          txToEdit.amount = newAmount;
        }
        currentCat.transactionSum = currentCat.transactionSum - oldAmount;
        currentCat.transactionSum = currentCat.transactionSum + newAmount;
        currentBudget.totalSpending = currentBudget.totalSpending - oldAmount;
        currentBudget.totalSpending = currentBudget.totalSpending + newAmount;
      });

      setIdStringModal("RESET");
      setEditSpendingModalVisible(false);
    }

    function pressedEditTransactionButton(idString) {
      let id = ObjectId(idString);
      let transToEdit = realm.objects("Transaction").filtered("_id == $0",id)[0];

      setPrevSpendingAmount(transToEdit.amount)
      setPrevSpendingName(transToEdit.name)
  
      setIdStringModal(idString);
      setEditSpendingModalVisible(true);
    }
  

    function handleDeleteTransaction(txIdString) {
      let id = ObjectId(txIdString);
      let txToDel = realm.objects("Transaction").filtered("_id == $0", id)[0];
      realm.write(() => {
        let diff = txToDel.amount;
        currentCat.transactionSum = currentCat.transactionSum - diff;
        currentBudget.totalSpending = currentBudget.totalSpending - diff;
        realm.delete(txToDel);
      });
    }

    function transactionsExist() {
      if(currentCat.transactions.length > 0) {
        return true;
      }
      return false;
    }

    const Spending = ({ title, amount, date, txIdString }) => {

      const deleteButton = <TouchableHighlight style={styles.deleteButton} onPress ={() => handleDeleteTransaction(txIdString)}>
                              <Text style={{paddingLeft: 20, color: 'white'}}>Delete</Text>
                            </TouchableHighlight>

      // ADD ONPRESS LATER*****************
    const editButton = <TouchableHighlight style={styles.editButton} onPress = {() => pressedEditTransactionButton(txIdString)}>
                        <Text style={{paddingLeft: 25, color: 'white'}}>Edit</Text>
                      </TouchableHighlight>    


      return( 
          <Swipeable rightButtons={[editButton, deleteButton]}>
            <View style = {styles.roundedButton}>
              <View style = {{alignContent: 'flex-start', maxWidth: '70%'}}>
                <Text style = {{fontWeight: 'bold'}}> {title} </Text>
                <Text> {date.toLocaleDateString()} </Text>
              </View>

              <View style = {{alignContent: 'flex-end', maxWidth: '30%'}}>
                <Text style = {styles.spendingAmount}> ${amount} </Text>
              </View>
            </View>
          </Swipeable>
        );
    };

    const ModalAddSpending = () => {
      const [spendingName, setSpendingName] = React.useState("");
      const [spending, setSpending] = React.useState(0);
      const [date, setDate] = React.useState(new Date());
      // const [amount, setAmount] = React.useState(0);
      
      
      function addTransaction(){
        handleAddTransaction(spendingName, date, spending);
        setSpendingName("");
        setDate("");
        setSpending(0);
        setSpendingModalVisible(false);
      }

      return (
        <Modal
        animationType="slide"
        transparent={true}
        visible={spendingModalVisible}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <View style={{flexDirection: 'row', alignSelf: 'stretch', justifyContent:'space-between', marginTop: 5}}>
                  <Text style={styles.sectionTitle}>New Transaction</Text>
                  <TouchableOpacity style={styles.cancelButton} onPress={() =>setSpendingModalVisible(false)}>
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                </View>
      
                <View>
                  <Text style={styles.textInputTitle}>Transaction Name</Text>
                  <TextInput
                    style={styles.textInputBox}
                    onChangeText={spendingName => setSpendingName(spendingName)}
                  />
                </View>
      
                <View>
                  <Text style={styles.textInputTitle}>Amount</Text>
                  <TextInput
                    style={styles.textInputBox}
                    keyboardType={'decimal-pad'}
                    onChangeText={newSpending => setSpending(newSpending)}
                  />
                </View>
      
                <TouchableOpacity style={styles.addBudgetButton} onPress={addTransaction}>
                  <Text>Submit</Text>
                </TouchableOpacity>
      
            </View>
          </View>
        </Modal>

      );
    }

    const ModalEditSpending = () => {
      const [spendingName, setSpendingName] = React.useState(prevSpendingName);
      const [spending, setSpending] = React.useState(prevSpendingLimit);
      const [date, setDate] = React.useState(new Date());
      // const [amount, setAmount] = React.useState(0);
      
      
      function pressedSubmitEditTransaction(){
        handleEditTransaction(spendingName, spending);
        setSpendingName("");
        setDate("");
        setSpending(0);
        setSpendingModalVisible(false);
      }

      return (
        <Modal
        animationType="slide"
        transparent={true}
        visible={editSpendingModalVisible}
        >
          <View style={styles.centeredView}>
            <View style={styles.modalView}>
                <View style={{flexDirection: 'row', alignSelf: 'stretch', justifyContent:'space-between', marginTop: 5}}>
                  <Text style={styles.sectionTitle}>Edit Transaction</Text>
                  <TouchableOpacity style={styles.cancelButton} onPress={() =>setEditSpendingModalVisible(false)}>
                    <Text>Cancel</Text>
                  </TouchableOpacity>
                </View>
      
                <View>
                  <Text style={styles.textInputTitle}>Transaction Name</Text>
                  <TextInput
                    style={styles.textInputBox}
                    onChangeText={input => setSpendingName(input)}
                    value={spendingName}
                  />
                </View>
      
                <View>
                  <Text style={styles.textInputTitle}>Amount</Text>
                  <TextInput
                    style={styles.textInputBox}
                    keyboardType={'decimal-pad'}
                    onChangeText={input => setSpending(input)}
                    value = {spending.toString()}
                  />
                </View>
      
                <TouchableOpacity style={styles.addBudgetButton} onPress={pressedSubmitEditTransaction}>
                  <Text>Submit</Text>
                </TouchableOpacity>
      
            </View>
          </View>
        </Modal>

      );
    }


    return(
      <SafeAreaView style={[styles.container, {backgroundColor: 'white'}]}>
      <ScrollView contentInsetAdjustmentBehavior="automatic">


      <View style = {{flexDirection:'row', justifyContent:'space-between', paddingVertical: 10}}>
        <Text style = {styles.titleText}> {currentCat.name}</Text>  
        {/* <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteCategory()}>  
          <Text>Delete Category</Text>
        </TouchableOpacity> */}
      </View>
        
      <View>
          {
              reversedTxs.map((item) => (
                <Spending
                  key = {item._id}
                  title = {item.name}
                  date = {item.date}   
                  amount = {item.amount.toFixed(2)}
                  txIdString = {item._id.toString()}
                />
              ))
          }
      </View>

      
      <View style={{height: 70}}/>
      
      <ModalAddSpending/>
      <ModalEditSpending/>
    </ScrollView>

    <TouchableOpacity style={styles.addButton} onPress={()=>setSpendingModalVisible(true)}>
      <Text style={styles.plusSymbol}>+</Text>
    </TouchableOpacity>
    
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    height: "100%",
    paddingHorizontal : 10,
    paddingVertical : 20,
  },

  roundedButton: {
    backgroundColor: buttonGrey,
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    marginHorizontal: 20,
  },

  spendingAmount: {
    fontWeight: 'bold',
    color:'red',
  },

  addCategoryButton: {
    backgroundColor: addButtonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 30,
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginVertical: 20,
    marginHorizontal: 50,
  },

  buttonText: {
    fontSize: 15,
    fontWeight: 'bold',
    maxWidth: '70%',
  },

  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  modalView: {
    margin: 10,
    backgroundColor: "white",
    borderRadius: 10,
    paddingHorizontal: 35,
    paddingVertical: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5
  },

  sectionTitle:{
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 10,
  },

  cancelButton: {
    backgroundColor: buttonGrey,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    width: 70,
    height: 40,
    marginTop: 10,
    marginRight: 10,
},

textInputTitle: {
  marginLeft: 10,
  color: 'grey',
  marginTop: 10,
  alignContent: 'flex-start',
},

textInputBox: {
  borderRadius: 20,
  borderColor: 'grey',
  borderWidth: 1,
  justifyContent: 'center',
  marginTop: 5, 
  paddingHorizontal: 10,
  height: 40,
  width: 300,
},

addBudgetButton: {
  backgroundColor: addButtonBlue,
  justifyContent: 'center',
  alignItems: 'center',
  borderRadius: 30,
  paddingVertical: 10,
  paddingHorizontal: 30,
  marginVertical: 20,
  marginHorizontal: 30,
},

sectionText: {
  fontSize: 20,
  fontWeight: 'bold',
  marginVertical : 10,
  marginHorizontal : 10,
},

addButton: {
  backgroundColor: addButtonBlue,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-end',
    bottom: 30,
    right: 30,
    borderRadius: 30,
    width: 60,
    height: 60,
    position: 'absolute',
    opacity: 0.92,
    shadowColor: 'rgba(0,0,0, .8)', // IOS
    shadowOffset: { height: 1, width: 1 }, // IOS
    shadowOpacity: 0.5, // IOS
    shadowRadius: 4, //IOS
    elevation: 2, // Android
},

centerAddSymbol: {
  justifyContent: 'center',
  alignItems: 'center',
  flex: 1
},

plusSymbol:{
  fontSize: 30,
  color: 'white',
  // fontWeight: 'bold',
  // paddingVertical: 10,
},

titleText: {
  fontSize: 30,
  fontWeight: 'bold',
  marginVertical: 10,
  marginHorizontal: 10,
},

deleteButton: {
  backgroundColor: 'tomato',
  width: 300,
  height: 60,
  justifyContent: 'center',
  alignItems: 'flex-start',
  shadowColor: 'rgba(0,0,0, .4)', // IOS
  shadowOffset: { height: 1, width: 1 }, // IOS
  shadowOpacity: 0.5, // IOS
  shadowRadius: 4, //IOS
  elevation: 2 // Android
}, 

editButton: {
  backgroundColor: 'orange',
  borderBottomLeftRadius: 10,
  borderTopLeftRadius: 10, 
  width: 200,
  height: 60,
  justifyContent: 'center',
  alignItems: 'flex-start',

  shadowColor: 'rgba(0,0,0, .4)', // IOS
      shadowOffset: { height: 1, width: 1 }, // IOS
      shadowOpacity: 0.5, // IOS
      shadowRadius: 4, //IOS
      elevation: 2, // Android
}, 
});