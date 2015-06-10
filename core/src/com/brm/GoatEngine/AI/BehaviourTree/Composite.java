package com.brm.GoatEngine.AI.BehaviourTree;

import java.util.ArrayList;

/**
 * Selectors, Sequences etc...
 **/
public abstract class Composite extends Node {

    protected ArrayList<Node> children;
    protected int currentNode; //The index of the current node being processed


    public Composite(){
        children = new ArrayList<Node>();
        currentNode = 0;
    }


    /**
     * Adds a node to the current composite
     * @param node
     * @return this for chaining
     */
    public Composite addNode(Node node){
        children.add(node);
        return this;
    }

    /**
     * removes a node from the current composite
     * @param node
     */
    public void removeNode(Node node){
        children.remove(node);
    }

}