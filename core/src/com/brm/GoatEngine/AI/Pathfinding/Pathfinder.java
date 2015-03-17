package com.brm.GoatEngine.AI.Pathfinding;

import com.badlogic.gdx.math.Rectangle;
import com.badlogic.gdx.math.Vector2;
import com.brm.GoatEngine.ECS.Components.PhysicsComponent;
import com.brm.GoatEngine.ECS.Entity.Entity;

import java.lang.reflect.Array;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;

/**
 * Class used to find path
 */
public class Pathfinder {

    public ArrayList<Node> nodes = new ArrayList<Node>();          //All the nodes

    // Nodes to be evaluated
    public ArrayList<Node> openNodes = new ArrayList<Node>();
    // Nodes already evaluated
    public ArrayList<Node> closedNodes = new ArrayList<Node>();

    public final float NODE_SIZE = 0.1f;

    /**
     * Scans the map and generate a connectivity graph
     * @param platforms
     */
    public void scanMap(ArrayList<Entity> platforms){
        //Scan all walkable platforms
        // All walkable tiles will be made into a node. Node connection is made
        // from right to left (parent_left)<-[connected]-(child_right)
        // from top to bottom (child_top)-[connected]->(parent_bottom)
        for(Entity platform: platforms){
            PhysicsComponent phys = (PhysicsComponent) platform.getComponent(PhysicsComponent.ID);
            Rectangle rect = phys.getBounds();

            //Add nodes to the left and the right edges of platform as nodes (out of the platform)
            Node leftEdgeNode = new Node(null, new Vector2(rect.getX()-1, rect.getY() + rect.getHeight()));

            Node rightEdgeNode = new Node(null, new Vector2(rect.getX() + rect.getWidth() - NODE_SIZE + 1,
                    rect.getY() + rect.getHeight())
            );

            this.nodes.add(leftEdgeNode);
            this.nodes.add(rightEdgeNode);

            //Add a node for the whole length of the platform
            for(int i =0; i < rect.getWidth(); i++){
                Node node = new Node(null, new Vector2(rect.getX() + i, rect.getY() + rect.getHeight()));
                this.nodes.add(node);
            }
        }
    }


    /**
     * Returns a list of all the reachable tiles that
     * are not in the closed list
     * @return
     */
    private ArrayList<Node> getReachableNodes(Vector2 current){

        ArrayList<Node> reachableNodes = new ArrayList<Node>();

        Node left = getNodeFor(new Vector2(current.x - 1, current.y));
        Node right = getNodeFor(new Vector2(current.x + 1, current.y));
        if(left != null){
            reachableNodes.add(left);
        }
        if(right != null){
            reachableNodes.add(right);
        }
        return reachableNodes;
    }



    /**
     * Gets the nearest node for a given position
     * @param position
     * @return
     */
    private Node getNodeFor(Vector2 position){
        Node nearest = null;
        int closesDistance = Integer.MAX_VALUE;
        for(Node node: this.nodes){
            int dist = getManhattanDistance(node.position, position);
            if(dist < closesDistance){
                closesDistance = dist;
                nearest = node;
            }
        }
        return nearest;
    }

    /**
     * Return the manhattan distance
     * distance between two points based on adding the horizontal distance and
     * vertical distances rather than computing the exact difference.
     * THIS IS A HEURISTIC
     * @param current
     * @param target
     * @return
     */
    private int getManhattanDistance(Vector2 current, Vector2 target){
        int dx = (int) Math.abs(target.x - current.x);
        int dy = (int) Math.abs(target.y - current.y);
        return dx + dy;
    }




    /**
     * Returns a Path
     * @param start
     * @param end
     * @return
     */
    public ArrayList<Vector2> findPath(Vector2 start, Vector2 end){

        this.openNodes.clear();
        this.closedNodes.clear();
        for(Node node: this.nodes){
            node.resetCost();
        }

        Node startNode = getNodeFor(start);
        Node endNode = getNodeFor(end);
        this.openNodes.add(startNode);


        while(!this.openNodes.isEmpty()){
            Node current = this.openNodes.get(0);
            //GET LOWEST FSCORE
            for(Node node: this.openNodes){
                if(node.getFCost() < current.getFCost() || node.getFCost() == current.getFCost() && node.hCost < current.hCost){
                    current = node;
                }
            }
            this.openNodes.remove(current);
            this.closedNodes.add(current);




            if(current.position.equals(endNode.position)){
                //PATH FOUND
                return this.tracePath(startNode, endNode);
            }

            for(Node neighbour : getReachableNodes(current.position)){
                if(this.closedNodes.contains(neighbour)){
                   continue;
                }

                int distToNeighbour = current.gCost + getManhattanDistance(current.position, neighbour.position);
                if(distToNeighbour < neighbour.gCost || !openNodes.contains(neighbour)){

                    neighbour.gCost = distToNeighbour;
                    neighbour.hCost = getManhattanDistance(neighbour.position, endNode.position);
                    neighbour.parent = current;


                    if(!openNodes.contains(neighbour)){
                        this.openNodes.add(neighbour);
                    }
                }
            }

        }
        // No path was found ==> empty list
        return new ArrayList<Vector2>();
    }




    private ArrayList<Vector2> tracePath(Node start, Node end){
        ArrayList<Vector2> path = new ArrayList<Vector2>();
        Node current = end;
        while(current.parent != null){
            path.add(current.position);
            current = current.parent;
        }

        Collections.reverse(path);
        return path;
    }

}
