package com.brm.GoatEngine.FSM;



import com.badlogic.gdx.Gdx;
import com.badlogic.gdx.utils.Array;
import com.badlogic.gdx.utils.XmlReader.Element;
import com.badlogic.gdx.utils.XmlWriter;
import com.badlogic.gdx.utils.XmlReader;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.StringWriter;
import java.util.ArrayList;

/**
 * A Data Driven State Machine
 */
public class FiniteStateMachine {

    private ArrayList<MachineState> states = new ArrayList<MachineState>();
    private MachineState currentState;

    public FiniteStateMachine(){

    }


    /**
     * Saves the machine to XML
     * @param filePath
     */
    public void saveToXML(String filePath) throws IOException {
        StringWriter writer = new StringWriter();
        XmlWriter xml = new XmlWriter(writer);
        xml.element("TestMachine");
        for(MachineState state: this.states){
            state.writeXml(xml);
        }
        xml.pop();
        //Write Xml
        FileOutputStream out = new FileOutputStream(filePath);
        out.write(writer.toString().getBytes());

    }


    public void loadFromXml(String filePath) throws IOException {
        XmlReader reader = new XmlReader();
        Element root = reader.parse(Gdx.files.internal(filePath));
        Array<Element> states = root.getChildrenByName("State");

        for(Element state : states){
            this.addState(new MachineState(state));
        }
    }





    public void addState(MachineState s) {
        this.states.add(s);
    }


    public ArrayList<MachineState> getStates() {
        return states;
    }
}
