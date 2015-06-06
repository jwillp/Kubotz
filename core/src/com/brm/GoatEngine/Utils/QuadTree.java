package com.brm.GoatEngine.Utils;

import com.badlogic.gdx.math.Rectangle;
import com.brm.GoatEngine.ECS.core.Entity.Entity;

import java.util.ArrayList;


public class QuadTree {

    // Nb of objects before the Node splits (means Nb ojects to check at once for collision)
    // Must be bigger than 1 or nothing will never collide with anything
    public static int MAX_OBJECTS = 4;
    // The deepest level subnode (max number of subsplit)
    public static int MAX_LEVELS = 5;


    private int level; // The current node level (Root = 0)

    // The 2D Space Bounds
    private Rectangle bounds;

    // The 4 subnodes
    private ArrayList<QuadTree> nodes;

    // The contained game objects of the current NODE (!= Tree)
    private ArrayList<Entity> entities;


    // Default root Ctor
    public QuadTree(Rectangle bounds){
        this.setBounds(bounds);
        this.level = 0;
        this.nodes = new ArrayList<QuadTree>();
        this.entities = new ArrayList<Entity>();
    }


    private QuadTree(int level, Rectangle bounds){
        this.setBounds(bounds);
        this.level = level;
        this.nodes = new ArrayList<QuadTree>();
        this.entities = new ArrayList<Entity>();
    }

    /**
     * Clears the quadtree recursively
     */
    public void clear(){
        this.entities.clear();
        /*for(QuadTree node: this.getNodes()){
            node.clear();
            this.getNodes().remove(node);
        }*/
        this.nodes.clear();
    }


    /**
     * Splits the node into 4 subnodes by dividing current node into 4 equal parts
     */
    private void split(){
        // Slice horizontaly to get sub nodes width
        float subWidth = this.getBounds().width / 2;
        // Slice vertically to get sub nodes height
        float subHeight = this.getBounds().height / 2;
        float x = this.getBounds().x;
        float y = this.getBounds().y;
        int newLevel = this.level + 1;

        // Create the 4 nodes
        this.getNodes().add(0, new QuadTree(newLevel, new Rectangle(x + subWidth, y, subWidth, subHeight)));
        this.getNodes().add(1, new QuadTree(newLevel, new Rectangle(x, y, subWidth, subHeight)));
        this.getNodes().add(2, new QuadTree(newLevel, new Rectangle(x, y + subHeight, subWidth, subHeight)));
        this.getNodes().add(3, new QuadTree(newLevel, new Rectangle(x + subWidth, y + subHeight, subWidth, subHeight)));

    }


    /**
     * Determines if the given object with bounds rect is part of the current QuadTree, by
     * returning the index (0-3) of the sub nodes it belongs to. If it does not belong to any sub node -1
     * is returned
     * @param entity: the object to find in the Tree
     * @return the index of the object found
     */
    private int getIndex(Entity entity){
        int currentIndex = 0;

        for(QuadTree node: this.getNodes()){

            /*PhysicsComponent bp = (PhysicsComponent)entity.getProperty(PhysicsComponent.ID);
            if(  node.getBounds().contains(bp.getBounds())){
                return currentIndex;
            }*/
            currentIndex++;
        }
        return -1; // Subnode not found (part of the root then)
    }

    /**
     * Insert an object with bounds rect into the QuadTree. If the node containing the object exceeds its
     * capacity, it splits and recursively adds the objects to the correct subnodes
     * @param entity: the object to add to the tree
     */
    public void insert(Entity entity){

        //Find the correct node for that object
        int index = this.getIndex(entity);
        if(index != -1){
            // Recursively insert
            this.getNodes().get(index).insert(entity);
        }

        //There is no subnode fit for this lets add it to the current node
        this.entities.add(entity);


        //Now that we have a new node, is the node ok with it?
        if(this.entities.size()> MAX_OBJECTS && this.level < MAX_LEVELS){
            // Nah... We need to split!
            this.split();

            // Let's reinsert all the objets in the current node into the right place
            int i = 0;
            while (i < this.entities.size()){
                Entity gObj = this.entities.get(i);
                index = this.getIndex(gObj);
                if(index != -1){
                    //WE need to reinsert it in the correct place
                    this.entities.remove(gObj);
                    this.nodes.get(index).insert(gObj);
                }else{
                    i += 1; //To the next gameObject
                }
            }
        }
    }

    /**
     * Returns all the objects colliding with the gameObject
     * NOTE: For the moment the node that could not be inserted any where are part of ROOT
     * They are not returned (because this functions returns the objects of the collision node)
     * @param entity
     * @return
     */
    public ArrayList<Entity> retrieve(Entity entity){
        int index = this.getIndex(entity);
        if (index != -1){
            // Recursiveley find its real node
            return this.getNodes().get(index).retrieve(entity);
        }else{
            // It is part of the current node
            ArrayList<Entity> collision = (ArrayList<Entity>) entities.clone();
            collision.remove(entity); //We dont want to return the entity itself as part of the collision
            return collision;
        }

    }


    public ArrayList<QuadTree> getNodes() {
        return nodes;
    }

    public Rectangle getBounds() {
        return bounds;
    }

    public void setBounds(Rectangle bounds) {
        this.bounds = bounds;
    }

}
